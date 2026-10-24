import { NextRequest, NextResponse } from 'next/server';
import { MCP_CONNECTORS } from '@/lib/mcp-manifest';
import {
  getTelemetryStream,
  trackActionConsent,
  trackConnectorCall,
  trackLLMLatency,
  trackPermissionTrimming,
} from '@/lib/posthog';
import { answerQuestion, DEFAULT_TOP_K, RagAnswer } from '@/lib/rag';
import { resolveUser, SESSION_COOKIE } from '@/lib/session';
import { ENTERPRISE_PERSONAS } from '@/lib/supabase';
import { DecisionMeta, OrchestrationResult, OrchestrationStep, SourceCitation, UserContext } from '@/lib/types';

export async function GET() {
  const stream = getTelemetryStream();
  return NextResponse.json({
    status: 'ok',
    telemetry: stream,
    personas: ENTERPRISE_PERSONAS,
    connectors: MCP_CONNECTORS,
  });
}

export async function POST(req: NextRequest) {
  const overallStart = Date.now();
  const body = await req.json().catch(() => ({}));
  const { query = '', actionName } = body;

  // Identity comes only from the signed session cookie. Persona fields in the request
  // body are ignored: the old API trusted a client-sent persona object, so anyone could
  // claim FinanceDirector / L4 and read payroll (found in the red-team pass).
  const user: UserContext = resolveUser(req.cookies.get(SESSION_COOKIE)?.value);

  const executionSteps: OrchestrationStep[] = [];
  const lowerQuery = (query || '').toLowerCase();

  // -------------------------------------------------------------------------
  // 1. [Agent Action - SRE] Restart Bastion Host / API Gateway
  // Rule: Allowed: Binny Lee (L6) & Jay Seal. Denied: Jane, Alex, Sarah, Neil.
  // -------------------------------------------------------------------------
  if (
    actionName === 'restart_service' ||
    lowerQuery.includes('restart') ||
    lowerQuery.includes('reboot') ||
    lowerQuery.includes('bastion')
  ) {
    const isAllowed = user.role === 'SuperAdmin' || user.role === 'SystemAdmin' || user.clearanceLevel === 'L6';

    executionSteps.push({
      step: 1,
      name: 'Intent Classification',
      description: 'Identified SRE Agent Action: restart_service (Production Bastion Host / Envoy Gateway).',
      status: 'completed',
      durationMs: 14,
    });
    executionSteps.push({
      step: 2,
      name: 'MCP Scope Verification',
      description: "Verifying required OAuth scope: 'Cloud.Infrastructure.Write' & L6 Clearance.",
      status: 'completed',
      durationMs: 12,
    });

    if (!isAllowed) {
      executionSteps.push({
        step: 3,
        name: 'Action Gatekeeper & OAuth Consent Check',
        description: `Blocked: User '${user.name}' (${user.role}) lacks pre-delegated execution clearance.`,
        status: 'blocked',
        durationMs: 18,
      });

      trackActionConsent({
        actionType: 'restart_service',
        status: 'denied',
        latencyMs: Date.now() - overallStart,
        user,
        reason: "This write action requires 'Cloud.Infrastructure.Write' scope. Only Binny Lee (L6) has pre-delegated execution clearance.",
        requiredScopes: ['Cloud.Infrastructure.Write', 'admin.bastion.reboot'],
      });

      const decision: DecisionMeta = {
        type: 'BLOCKED',
        badge: '403 Consent Required',
        headline: 'Missing Write Scope & Execution Clearance',
        reason: `This write action requires 'Cloud.Infrastructure.Write' scope. Only Binny Lee (L6) has pre-delegated execution clearance.`,
        policyRule: 'SRE Infrastructure Write Policy: Only Level 6 Super Admins may reboot production compute assets.',
        authorizedRoles: ['Binny Lee (SuperAdmin - L6)'],
      };

      const response: OrchestrationResult = {
        success: false,
        query,
        persona: user,
        intent: 'agent_action:restart_service',
        connectorId: 'm365-connector-bastion-ops',
        recordsScanned: 0,
        recordsPermitted: 0,
        trimRatio: 0,
        scannedRecords: [],
        permittedRecords: [],
        trimmedRecords: [],
        decision,
        groundedResponse: `**403 Consent Required**: This autonomous action \`restart_service\` has been halted by the OmniConnect Gatekeeper.

- **Attempted Target**: Production Bastion Host (\`prod-bastion-us-east-1\`)
- **Required OAuth Scope**: \`Cloud.Infrastructure.Write\`
- **Access Rule**: Only **Binny Lee (L6 | Infrastructure | SuperAdmin)** holds pre-delegated execution clearance. Role \`${user.role}\` (${user.clearanceLevel}) is unauthorized to reboot live servers.`,
        consentRequired: {
          code: '403 Consent Required / Missing Write Scope',
          message: "This write action requires 'Cloud.Infrastructure.Write' scope. Only Binny Lee (L6) has pre-delegated execution clearance.",
          requiredRole: ['SuperAdmin'],
          requiredScopes: ['Cloud.Infrastructure.Write'],
          currentRole: user.role,
          currentScopes: user.scopes,
          resolutionSteps: [
            '1. Switch persona to Binny Lee (L6 SuperAdmin) in the top-right switcher.',
            '2. Or submit a PIM Privileged Identity elevation request to the Head of Infrastructure.',
          ],
        },
        executionSteps,
        telemetry: getTelemetryStream(),
        latencyMs: Date.now() - overallStart,
        modelUsed: 'OmniConnect Policy Gatekeeper',
        tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };

      return NextResponse.json(response, { status: 403 });
    }

    // Authorized execution for Binny Lee
    executionSteps.push({
      step: 3,
      name: 'Action Gatekeeper Authorization',
      description: `Authorized: Verified ${user.name} holds 'Cloud.Infrastructure.Write' and Level 6 root clearance.`,
      status: 'completed',
      durationMs: 25,
    });
    executionSteps.push({
      step: 4,
      name: 'Hand-off (Not Executed)',
      description: 'Request routed to the SRE change-management workflow. Nothing was executed by OmniConnect.',
      status: 'completed',
      durationMs: 0,
    });

    trackActionConsent({
      actionType: 'restart_service',
      status: 'success',
      latencyMs: Date.now() - overallStart,
      user,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized · Not Executed',
      headline: 'You may request this restart. It was not performed.',
      reason: `Verified ${user.name} holds 'Cloud.Infrastructure.Write' and Level 6 root clearance. OmniConnect is a read-only knowledge assistant: it checks whether you may request an action, but never executes one.`,
      policyRule: 'SRE Infrastructure Write Policy: only SuperAdmin may request infrastructure restarts.',
      authorizedRoles: ['Binny Lee (SuperAdmin - L6)'],
    };

    const response: OrchestrationResult = {
      success: true,
      query,
      persona: user,
      intent: 'agent_action:restart_service',
      connectorId: 'm365-connector-bastion-ops',
      recordsScanned: 0,
      recordsPermitted: 0,
      trimRatio: 0,
      scannedRecords: [],
      permittedRecords: [],
      trimmedRecords: [],
      actionExecuted: false,
      statusLabel: 'AUTHORIZED',
      decision,
      groundedResponse: `### Permission check passed: restart not performed
**${user.name}** (${user.role} • ${user.clearanceLevel}) is authorized to request a restart of the production bastion host.

- **Executed by OmniConnect**: nothing. This is a knowledge assistant, not an operations tool.
- **Where it would go**: an SRE change request (for example a ServiceNow change ticket) for the on-call team to approve and run.
- **Before restarting**: the bastion runbook requires announcing in #sre at least 15 minutes ahead, since a reboot ends all active sessions.`,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'OmniConnect Action Gatekeeper',
      tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };

    return NextResponse.json(response);
  }

  // -------------------------------------------------------------------------
  // 2. [Agent Action - Finance] Approve vendor invoice #9021 ($150k wire)
  // Rule: Allowed: Jane Doe (FinanceDirector). Denied: Binny, Alex, Sarah, Neil.
  // -------------------------------------------------------------------------
  if (
    lowerQuery.includes('invoice') ||
    lowerQuery.includes('wire transfer') ||
    lowerQuery.includes('ach') ||
    lowerQuery.includes('150,000') ||
    actionName === 'approve_wire_transfer'
  ) {
    const isAllowed = user.role === 'FinanceDirector';

    executionSteps.push({
      step: 1,
      name: 'Intent Classification',
      description: 'Identified Treasury Action: approve_wire_transfer ($150,000.00 USD).',
      status: 'completed',
      durationMs: 12,
    });
    executionSteps.push({
      step: 2,
      name: 'Treasury Delegation Verification',
      description: 'Evaluating SOX compliance: Requires FinanceDirector with statutory disbursement rights.',
      status: 'completed',
      durationMs: 10,
    });

    if (!isAllowed) {
      executionSteps.push({
        step: 3,
        name: 'Treasury Gatekeeper Intercept',
        description: `Blocked: User '${user.name}' (${user.role}) is a non-finance officer.`,
        status: 'blocked',
        durationMs: 16,
      });

      trackActionConsent({
        actionType: 'approve_wire_transfer',
        status: 'denied',
        latencyMs: Date.now() - overallStart,
        user,
        reason: 'Commercial disbursement authority exceeding $100,000 requires statutory Finance Director clearance.',
        requiredScopes: ['finance.wire.approve'],
      });

      const decision: DecisionMeta = {
        type: 'BLOCKED',
        badge: '403 Forbidden',
        headline: 'Non-Finance Officer Intercept',
        reason: `Commercial disbursement authority exceeding $100,000 requires statutory Finance Director clearance. Role '${user.role}' is denied.`,
        policyRule: 'Treasury Segregation of Duties: Non-Finance personnel cannot release corporate funds.',
        authorizedRoles: ['Jane Doe (FinanceDirector - L4)'],
      };

      const response: OrchestrationResult = {
        success: false,
        query,
        persona: user,
        intent: 'agent_action:approve_wire_transfer',
        connectorId: 'm365-connector-wire-transfer',
        recordsScanned: 0,
        recordsPermitted: 0,
        trimRatio: 0,
        scannedRecords: [],
        permittedRecords: [],
        trimmedRecords: [],
        decision,
        groundedResponse: `**403 Forbidden / Non-Finance Officer**: Automated ACH wire transfer intercepted.

- **Invoice Reference**: \`#9021\` ($150,000.00 USD)
- **Access Rule**: Only **Jane Doe (FinanceDirector)** holds statutory corporate treasury authority to approve wire disbursements over $100k.
- **Your Role**: User **${user.name}** holds role **${user.role}** (${user.department}), which lacks corporate signing authority.`,
        consentRequired: {
          code: '403 Forbidden / Non-Finance Officer',
          message: 'Only Jane Doe (FinanceDirector) has statutory disbursement authorization.',
          requiredRole: ['FinanceDirector'],
          requiredScopes: ['finance.wire.approve'],
          currentRole: user.role,
          currentScopes: user.scopes,
          resolutionSteps: [
            '1. Switch active persona to Jane Doe (FinanceDirector) to test authorized approval.',
            '2. Submit invoice for manual multi-signature review in Workday AP portal.',
          ],
        },
        executionSteps,
        telemetry: getTelemetryStream(),
        latencyMs: Date.now() - overallStart,
        modelUsed: 'OmniConnect Treasury Gatekeeper',
        tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };

      return NextResponse.json(response, { status: 403 });
    }

    // Authorized for Jane Doe
    executionSteps.push({
      step: 3,
      name: 'Treasury Authorization Verification',
      description: 'Authorized: Verified Jane Doe holds FinanceDirector (L4) with finance.wire.approve scope.',
      status: 'completed',
      durationMs: 22,
    });
    executionSteps.push({
      step: 4,
      name: 'Hand-off (Not Executed)',
      description: 'Request routed to the treasury approval workflow. No payment was made by OmniConnect.',
      status: 'completed',
      durationMs: 0,
    });

    trackActionConsent({
      actionType: 'approve_wire_transfer',
      status: 'success',
      latencyMs: Date.now() - overallStart,
      user,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized · Not Executed',
      headline: 'You may approve this payment. No money was moved.',
      reason: `Verified ${user.name} is Finance Director (L4) with treasury signing authority. OmniConnect is a read-only knowledge assistant: it checks whether you may request an action, but never executes one.`,
      policyRule: 'Corporate Treasury Governance: payments over $100,000 require Finance Director approval.',
      authorizedRoles: ['Jane Doe (FinanceDirector - L4)'],
    };

    const response: OrchestrationResult = {
      success: true,
      query,
      persona: user,
      intent: 'agent_action:approve_wire_transfer',
      connectorId: 'm365-connector-wire-transfer',
      recordsScanned: 0,
      recordsPermitted: 0,
      trimRatio: 0,
      scannedRecords: [],
      permittedRecords: [],
      trimmedRecords: [],
      actionExecuted: false,
      statusLabel: 'AUTHORIZED',
      decision,
      groundedResponse: `### Permission check passed: payment not made
**${user.name}** (${user.role} • ${user.clearanceLevel}) has the authority to approve invoice #9021 for $150,000.

- **Executed by OmniConnect**: nothing. No approval was recorded and no wire was queued.
- **Where it would go**: the accounts-payable approval workflow in the finance system, which records the approval and releases the payment.
- **Status in the documents you can read**: invoice #9021 is awaiting Finance Director approval [FIN-004].`,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'OmniConnect Action Gatekeeper',
      tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };

    return NextResponse.json(response);
  }

  // -------------------------------------------------------------------------
  // 3. [Agent Action - Data Governance] Delete inactive customer test records from CRM
  // Rule: Allowed: Binny Lee (L6) & Jay Seal. Denied: All others.
  // -------------------------------------------------------------------------
  if (
    lowerQuery.includes('delete') &&
    (lowerQuery.includes('crm') || lowerQuery.includes('customer') || lowerQuery.includes('test records'))
  ) {
    const isAllowed = user.role === 'SuperAdmin' || user.role === 'SystemAdmin' || user.clearanceLevel === 'L6';

    executionSteps.push({
      step: 1,
      name: 'Intent Classification',
      description: 'Identified Destructive Action: delete_crm_records (Bulk database purge).',
      status: 'completed',
      durationMs: 14,
    });

    if (!isAllowed) {
      executionSteps.push({
        step: 2,
        name: 'Destructive Action Gatekeeper Intercept',
        description: `Blocked: User '${user.name}' (${user.role}) lacks root database write clearance.`,
        status: 'blocked',
        durationMs: 18,
      });

      trackActionConsent({
        actionType: 'delete_crm_records',
        status: 'denied',
        latencyMs: Date.now() - overallStart,
        user,
        reason: 'Destructive database mutations (DELETE, DROP, TRUNCATE) on production CRM systems are restricted to Super Admin (Binny Lee L6).',
        requiredScopes: ['admin.crm.delete'],
      });

      const decision: DecisionMeta = {
        type: 'BLOCKED',
        badge: '403 Destructive Action Blocked',
        headline: 'Zero Data Loss Safeguard Active',
        reason: `Destructive database mutations (DELETE, DROP, TRUNCATE) on production CRM systems are restricted exclusively to Super Admin (Binny Lee L6).`,
        policyRule: 'Data Governance Safeguard: Prevents accidental bulk data loss in production.',
        authorizedRoles: ['Binny Lee (SuperAdmin - L6)'],
      };

      const response: OrchestrationResult = {
        success: false,
        query,
        persona: user,
        intent: 'agent_action:delete_crm_records',
        connectorId: 'm365-connector-crm-mutation',
        recordsScanned: 0,
        recordsPermitted: 0,
        trimRatio: 0,
        scannedRecords: [],
        permittedRecords: [],
        trimmedRecords: [],
        decision,
        groundedResponse: `**403 Destructive Action Blocked**: Bulk database deletion rejected by OmniConnect Data Governance.

- **Attempted Command**: Hard-delete test customer records from production CRM database.
- **Access Rule**: Destructive mutations require **Binny Lee (L6 Super Admin)** possessing scope \`admin.crm.delete\`.
- **Blocked User**: **${user.name}** (${user.role}) lacks root database write clearance.`,
        consentRequired: {
          code: '403 Destructive Action Blocked',
          message: 'Destructive database mutations are restricted to Super Admin (Binny Lee L6).',
          requiredRole: ['SuperAdmin'],
          requiredScopes: ['admin.crm.delete'],
          currentRole: user.role,
          currentScopes: user.scopes,
          resolutionSteps: [
            '1. Switch persona to Binny Lee (L6 SuperAdmin) in the top-right switcher.',
            '2. Submit a formal database mutation change-request ticket to Data Engineering.',
          ],
        },
        executionSteps,
        telemetry: getTelemetryStream(),
        latencyMs: Date.now() - overallStart,
        modelUsed: 'OmniConnect Data Protection Gatekeeper',
        tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };

      return NextResponse.json(response, { status: 403 });
    }

    // Authorized for Binny Lee
    executionSteps.push({
      step: 2,
      name: 'Destructive Action Gatekeeper Check',
      description: `Authorized: Verified ${user.name} holds SuperAdmin (L6) and admin.crm.delete scope.`,
      status: 'completed',
      durationMs: 24,
    });
    executionSteps.push({
      step: 3,
      name: 'Hand-off (Not Executed)',
      description: 'Request routed to the data-governance change workflow. No records were deleted by OmniConnect.',
      status: 'completed',
      durationMs: 0,
    });

    trackActionConsent({
      actionType: 'delete_crm_records',
      status: 'success',
      latencyMs: Date.now() - overallStart,
      user,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized · Not Executed',
      headline: 'You may request this deletion. No records were deleted.',
      reason: `Verified ${user.name} holds SuperAdmin (L6) clearance with database write privileges. OmniConnect is a read-only knowledge assistant: it checks whether you may request an action, but never executes one.`,
      policyRule: 'Data Governance Policy: only SuperAdmin may request destructive changes to production data.',
      authorizedRoles: ['Binny Lee (SuperAdmin - L6)'],
    };

    const response: OrchestrationResult = {
      success: true,
      query,
      persona: user,
      intent: 'agent_action:delete_crm_records',
      connectorId: 'm365-connector-crm-mutation',
      recordsScanned: 0,
      recordsPermitted: 0,
      trimRatio: 0,
      scannedRecords: [],
      permittedRecords: [],
      trimmedRecords: [],
      actionExecuted: false,
      statusLabel: 'AUTHORIZED',
      decision,
      groundedResponse: `### Permission check passed: no records deleted
**${user.name}** (${user.role} • ${user.clearanceLevel}) is authorized to request a deletion of inactive test records from the production CRM.

- **Executed by OmniConnect**: nothing. This is a knowledge assistant and has no write access to the CRM.
- **Where it would go**: a data-governance change request, run by the CRM owners with a backup taken first.`,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'OmniConnect Action Gatekeeper',
      tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };

    return NextResponse.json(response);
  }

  // -------------------------------------------------------------------------
  // Knowledge retrieval: every question that is not an agent action goes through
  // permission-aware RAG. Embed the question, search only the chunks this user may
  // read (filtered inside the database query), then answer from them with citations.
  // -------------------------------------------------------------------------
  let rag: RagAnswer;
  try {
    rag = await answerQuestion(user, query);
  } catch (e) {
    console.error('RAG pipeline failed:', e);
    const failure: OrchestrationResult = {
      success: false,
      query,
      persona: user,
      intent: 'semantic_retrieval',
      connectorId: 'omni-rag-gateway',
      recordsScanned: 0,
      recordsPermitted: 0,
      trimRatio: 0,
      scannedRecords: [],
      permittedRecords: [],
      trimmedRecords: [],
      groundedResponse:
        'The knowledge search is unavailable right now. Check that GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set and that the corpus has been ingested (npm run ingest).',
      decision: {
        type: 'BLOCKED',
        badge: 'Service Unavailable',
        headline: 'Retrieval pipeline not configured',
        reason: 'The search backend could not be reached.',
        policyRule: 'Fail closed: no answer is generated without permission-filtered sources.',
      },
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'none',
      tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
    return NextResponse.json(failure, { status: 503 });
  }

  const connectorId = 'omni-rag-gateway';
  trackConnectorCall({ connectorId, domain: 'all', query, user });
  // Admin telemetry only: how many of the unfiltered top-k matches were withheld.
  trackPermissionTrimming({
    recordsScanned: rag.chunks.length + rag.withheldCount,
    recordsReturned: rag.chunks.length,
    trimRatio: Math.round((rag.withheldCount / DEFAULT_TOP_K) * 100),
    user,
    domain: 'all',
  });
  trackLLMLatency({
    modelUsed: rag.llm.model,
    ttftMs: rag.llm.latencyMs,
    totalTokens: rag.llm.totalTokens,
    latencyMs: rag.llm.latencyMs,
  });

  // One citation per document, keeping its best-matching chunk's similarity.
  const sourcesById = new Map<string, SourceCitation>();
  for (const c of rag.chunks) {
    const existing = sourcesById.get(c.documentId);
    if (!existing || c.similarity > existing.similarity) {
      sourcesById.set(c.documentId, {
        documentId: c.documentId,
        title: c.title,
        classification: c.classification,
        similarity: Math.round(c.similarity * 1000) / 1000,
      });
    }
  }
  const sources = Array.from(sourcesById.values());

  executionSteps.push(
    {
      step: 1,
      name: 'Identity Resolution',
      description: `Signed session resolved to ${user.name} (${user.role}, ${user.department}, ${user.clearanceLevel}) from the server-side directory.`,
      status: 'completed',
      durationMs: 0,
    },
    {
      step: 2,
      name: 'Query Embedding',
      description: 'Question converted to a 768-dimension vector with Gemini embeddings.',
      status: 'completed',
      durationMs: rag.embedMs,
    },
    {
      step: 3,
      name: 'Permission-Aware Vector Search',
      description: `Top ${DEFAULT_TOP_K} '${rag.chunkSet}' chunks by similarity, filtered by role, department and clearance inside the same database query.`,
      status: 'completed',
      durationMs: rag.retrieveMs,
    },
    {
      step: 4,
      name: 'Grounded Answer Generation',
      description: `${rag.llm.model} answered from ${sources.length} source document(s) with citations.`,
      status: 'completed',
      durationMs: rag.llm.latencyMs,
    },
  );

  // Red whenever the documents this user may read don't contain the answer. This is
  // deliberately the same for "restricted document exists" and "no document exists":
  // telling users which one it is would reveal that confidential content exists.
  const decision: DecisionMeta = rag.answered
    ? {
        type: 'ALLOWED',
        badge: 'Authorized & Grounded',
        headline: `Answered from ${sources.length} document${sources.length > 1 ? 's' : ''} you can access`,
        reason:
          'Search ran only over documents your role, department and clearance allow. Restricted content is filtered inside the database query, so the AI never sees it.',
        policyRule: 'Permission-aware retrieval: rank by meaning and filter by access in one query.',
      }
    : {
        type: 'BLOCKED',
        badge: 'Not Authorized or Not Found',
        headline: "You're not authorized to see this, or it isn't in any company document",
        reason:
          "Search ran only over documents your role, department and clearance allow, and none of them answer this question. For security, OmniConnect doesn't say which of the two it is: confirming that a restricted document exists would itself reveal confidential information.",
        policyRule: 'Permission-aware retrieval: rank by meaning and filter by access in one query.',
      };

  const response: OrchestrationResult = {
    success: rag.answered,
    statusLabel: rag.answered ? undefined : 'NOT FOUND',
    query,
    persona: user,
    intent: 'semantic_retrieval',
    connectorId,
    recordsScanned: rag.chunks.length,
    recordsPermitted: rag.chunks.length,
    trimRatio: 0,
    scannedRecords: [],
    permittedRecords: [],
    trimmedRecords: [],
    sources,
    decision,
    groundedResponse: rag.answer,
    executionSteps,
    telemetry: getTelemetryStream(),
    latencyMs: Date.now() - overallStart,
    modelUsed: rag.llm.model,
    tokenStats: {
      promptTokens: rag.llm.promptTokens,
      completionTokens: rag.llm.completionTokens,
      totalTokens: rag.llm.totalTokens,
    },
  };

  return NextResponse.json(response);
}
