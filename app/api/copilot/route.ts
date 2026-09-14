import { NextRequest, NextResponse } from 'next/server';
import { MCP_CONNECTORS } from '@/lib/mcp-manifest';
import { generateGroundedResponse } from '@/lib/openrouter';
import {
  getTelemetryStream,
  trackActionConsent,
  trackConnectorCall,
  trackLLMLatency,
  trackPermissionTrimming,
} from '@/lib/posthog';
import { ENTERPRISE_PERSONAS, runSessionScopedRLSQuery } from '@/lib/supabase';
import { DecisionMeta, OrchestrationResult, OrchestrationStep, UserContext } from '@/lib/types';

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
  const { query = '', personaId, persona: customPersona, actionName } = body;

  // Resolve active persona
  const matchedPersona = ENTERPRISE_PERSONAS.find((p) => p.id === personaId);
  const user: UserContext =
    customPersona ||
    (matchedPersona
      ? {
          userId: matchedPersona.id,
          name: matchedPersona.name,
          email: `${matchedPersona.name.toLowerCase().replace(' ', '.')}@enterprise.internal`,
          department: matchedPersona.department,
          role: matchedPersona.role,
          clearanceLevel: matchedPersona.clearanceLevel,
          scopes: matchedPersona.scopes,
        }
      : {
          userId: 'usr_neil',
          name: 'Neil Wright',
          email: 'neil.wright@enterprise.internal',
          department: 'General',
          role: 'Intern',
          clearanceLevel: 'L1',
          scopes: ['read.public.directory'],
        });

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
      name: 'SRE Bastion RPC Execution',
      description: 'Dispatched node connection drain and hypervisor reboot signal to AWS EC2.',
      status: 'completed',
      durationMs: 110,
    });

    trackActionConsent({
      actionType: 'restart_service',
      status: 'success',
      latencyMs: Date.now() - overallStart,
      user,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized & Executed',
      headline: 'Host Gracefully Drained & Rebooted',
      reason: `Verified ${user.name} holds 'Cloud.Infrastructure.Write' and Level 6 root clearance.`,
      policyRule: 'SRE Infrastructure Write Policy: SuperAdmin pre-delegated write consent granted.',
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
      actionExecuted: true,
      decision,
      groundedResponse: `### Autonomous SRE Action Executed Successfully
**Authorized Executive**: **${user.name}** (${user.role} • ${user.clearanceLevel}).

- **Target Host**: \`prod-bastion-us-east-1\` (AWS us-east-1a)
- **Execution Telemetry**:
  - \`[00:00.120]\` Initiated graceful client connection drain (0 active dropped packets).
  - \`[00:01.850]\` Dispatched ACPI reboot pulse to hypervisor controller.
  - \`[00:03.400]\` WireGuard mesh tunnels and SSH daemons re-initialized.
  - \`[00:03.880]\` Ingress health probe ping returned HTTP 200 OK.
- **Audit Stamp**: \`SRE-OPS-${Date.now().toString(36).toUpperCase()}\``,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'OmniConnect SRE Controller',
      tokenStats: { promptTokens: 42, completionTokens: 145, totalTokens: 187 },
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
      name: 'ACH FedLine Release',
      description: 'Signed digital disbursement certificate and queued transfer batch.',
      status: 'completed',
      durationMs: 85,
    });

    trackActionConsent({
      actionType: 'approve_wire_transfer',
      status: 'success',
      latencyMs: Date.now() - overallStart,
      user,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized & Executed',
      headline: 'Commercial ACH Wire Queued',
      reason: 'Authorized: Jane Doe is Finance Director (L4) with statutory treasury signing authority.',
      policyRule: 'Corporate Treasury Governance: Authorized for Finance Director.',
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
      actionExecuted: true,
      decision,
      groundedResponse: `### Commercial Wire Transfer Approved & Queued
**Authorized Signer**: **${user.name}** (${user.role} • Clearance: ${user.clearanceLevel}).

- **Invoice**: \`#9021\` ($150,000.00 USD - Cloud Infrastructure Hosting Services)
- **Settlement Method**: Corporate Same-Day ACH Wire Transfer
- **Federal Reserve Batch Ref**: \`ACH-FED-2025-${Date.now().toString().slice(-6)}\`
- **Audit Stamp**: Dual-key cryptographic hash signed with Jane Doe enterprise certificate.`,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'OmniConnect Treasury Controller',
      tokenStats: { promptTokens: 38, completionTokens: 128, totalTokens: 166 },
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
      name: 'CRM Database Transaction Purge',
      description: 'Executed safe transaction with rollback point on 1,842 test accounts.',
      status: 'completed',
      durationMs: 115,
    });

    trackActionConsent({
      actionType: 'delete_crm_records',
      status: 'success',
      latencyMs: Date.now() - overallStart,
      user,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized & Executed',
      headline: '1,842 Inactive Test Records Purged',
      reason: `Verified Binny Lee holds SuperAdmin (L6) root clearance with database write privileges.`,
      policyRule: 'Data Governance Policy: SuperAdmin root mutation executed with rollback snapshot.',
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
      actionExecuted: true,
      decision,
      groundedResponse: `### Production CRM Inactive Test Records Purged
**Authorized Super Admin**: **${user.name}** (${user.role} • L6 Root).

- **Target CRM Cluster**: \`crm-prod-customer-cluster\` (PostgreSQL)
- **Execution Filter**: \`WHERE account_type = 'INTERNAL_TEST' AND last_active < NOW() - INTERVAL '180 days'\`
- **Result**: **1,842 records archived and safely purged**.
- **Pre-Delete Snapshot**: \`crm-snapshot-pre-delete-${Date.now().toString().slice(-4)}\`
- **Audit Receipt**: \`SEC-DB-PURGE-${Date.now().toString(36).toUpperCase()}\``,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: 'OmniConnect CRM Controller',
      tokenStats: { promptTokens: 39, completionTokens: 132, totalTokens: 171 },
    };

    return NextResponse.json(response);
  }

  // -------------------------------------------------------------------------
  // 6. [Knowledge Retrieval - Public] "Who is the CEO of this company?"
  // Rule: Allowed: Everyone (including Neil Wright - Intern).
  // -------------------------------------------------------------------------
  if (
    lowerQuery.includes('ceo') &&
    !lowerQuery.includes('stock') &&
    !lowerQuery.includes('vesting') &&
    !lowerQuery.includes('bonus')
  ) {
    const domain = 'company_directory';
    const rlsResult = await runSessionScopedRLSQuery(user, domain);

    trackConnectorCall({ connectorId: 'm365-connector-directory', domain, query, user });
    trackPermissionTrimming({
      recordsScanned: rlsResult.recordsScanned,
      recordsReturned: rlsResult.recordsPermitted,
      trimRatio: rlsResult.trimRatio,
      user,
      domain,
    });

    const llm = await generateGroundedResponse({
      query,
      user,
      permittedRecords: rlsResult.permittedRecords,
      trimmedCount: rlsResult.recordsTrimmed,
      domain,
    });

    trackLLMLatency({ modelUsed: llm.modelUsed, ttftMs: llm.ttftMs, totalTokens: llm.totalTokens, latencyMs: llm.latencyMs });

    executionSteps.push({
      step: 1,
      name: 'Intent Classification',
      description: 'Routed to Enterprise Public Directory (Public L1 Clearance).',
      status: 'completed',
      durationMs: 10,
    });
    executionSteps.push({
      step: 2,
      name: 'Supabase RLS Query',
      description: `Matched 1 record in company_directory. Injected into context (0 trimmed).`,
      status: 'completed',
      durationMs: 25,
    });
    executionSteps.push({
      step: 3,
      name: 'Grounded LLM Response Synthesis',
      description: 'Synthesized leadership profile from verified enterprise directory.',
      status: 'completed',
      durationMs: llm.latencyMs,
    });

    const decision: DecisionMeta = {
      type: 'ALLOWED',
      badge: 'Authorized & Grounded',
      headline: 'Public Corporate Knowledge Verified',
      reason: 'Allowed: Company leadership is public information (Clearance L1). Accessible to everyone including interns.',
      policyRule: 'Public Directory Policy: General corporate hierarchy is unrestricted.',
      authorizedRoles: ['All Roles (Jane, Alex, Sarah, Binny, Neil Wright)'],
    };

    const response: OrchestrationResult = {
      success: true,
      query,
      persona: user,
      intent: 'semantic_retrieval:company_directory',
      connectorId: 'm365-connector-directory',
      recordsScanned: rlsResult.recordsScanned,
      recordsPermitted: rlsResult.recordsPermitted,
      trimRatio: 0,
      scannedRecords: rlsResult.allCandidates,
      permittedRecords: rlsResult.permittedRecords,
      trimmedRecords: [],
      decision,
      groundedResponse: llm.content,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: llm.modelUsed,
      tokenStats: { promptTokens: llm.promptTokens, completionTokens: llm.completionTokens, totalTokens: llm.totalTokens },
    };

    return NextResponse.json(response);
  }

  // -------------------------------------------------------------------------
  // 4. [Knowledge Retrieval - Confidential] CEO & VP Eng stock vesting & bonus
  // Rule: Allowed: Jane Doe & Sarah Chen (and Jay Seal). Denied/Masked: Alex, Binny, Neil.
  // -------------------------------------------------------------------------
  if (
    lowerQuery.includes('stock') ||
    lowerQuery.includes('vesting') ||
    lowerQuery.includes('bonus') ||
    lowerQuery.includes('compensation')
  ) {
    const domain = 'executive_payroll';
    const rlsResult = await runSessionScopedRLSQuery(user, domain);
    const isAllowed = rlsResult.recordsPermitted > 0;

    trackConnectorCall({ connectorId: 'm365-connector-executive-payroll', domain, query, user });
    trackPermissionTrimming({
      recordsScanned: rlsResult.recordsScanned,
      recordsReturned: rlsResult.recordsPermitted,
      trimRatio: rlsResult.trimRatio,
      user,
      domain,
    });

    const llm = await generateGroundedResponse({
      query,
      user,
      permittedRecords: rlsResult.permittedRecords,
      trimmedCount: rlsResult.recordsTrimmed,
      domain,
      securityInterceptNote: rlsResult.securityInterceptNote,
    });

    trackLLMLatency({ modelUsed: llm.modelUsed, ttftMs: llm.ttftMs, totalTokens: llm.totalTokens, latencyMs: llm.latencyMs });

    executionSteps.push({
      step: 1,
      name: 'Intent Classification',
      description: 'Routed to Executive Payroll & Equity Ledger (Restricted L4+).',
      status: 'completed',
      durationMs: 12,
    });
    executionSteps.push({
      step: 2,
      name: 'Supabase RLS Evaluation',
      description: isAllowed
        ? `Authorized: User '${user.name}' holds ${user.role} clearance. Injected 1 confidential ledger record.`
        : `Policy Boundary Enforced: 1 record filtered by Supabase Row-Level Security. Role '${user.role}' lacks clearance.`,
      status: isAllowed ? 'completed' : 'blocked',
      durationMs: 30,
    });

    const decision: DecisionMeta = {
      type: isAllowed ? 'ALLOWED' : 'BLOCKED',
      badge: isAllowed ? 'Authorized & Grounded' : 'Policy Boundary Enforced',
      headline: isAllowed ? 'Executive Compensation Ledger Grounded' : 'RLS Trimmed: 0 Records Permitted',
      reason: isAllowed
        ? `Authorized: User ${user.name} (${user.role} • ${user.clearanceLevel}) holds executive compensation clearance.`
        : `Policy Boundary Enforced: 1 record filtered by Supabase Row-Level Security. Role '${user.role}' lacks clearance for confidential compensation files.`,
      policyRule: 'Executive Equity Policy: Confidential stock ledgers require FinanceDirector or EnterpriseAdmin clearance.',
      authorizedRoles: ['Jane Doe (FinanceDirector)', 'Sarah Chen (EnterpriseAdmin)'],
    };

    const response: OrchestrationResult = {
      success: isAllowed,
      query,
      persona: user,
      intent: 'semantic_retrieval:executive_payroll',
      connectorId: 'm365-connector-executive-payroll',
      recordsScanned: rlsResult.recordsScanned,
      recordsPermitted: rlsResult.recordsPermitted,
      trimRatio: rlsResult.trimRatio,
      securityInterceptNote: rlsResult.securityInterceptNote,
      scannedRecords: rlsResult.allCandidates,
      permittedRecords: rlsResult.permittedRecords,
      trimmedRecords: rlsResult.trimmedRecords,
      decision,
      groundedResponse: llm.content,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: llm.modelUsed,
      tokenStats: { promptTokens: llm.promptTokens, completionTokens: llm.completionTokens, totalTokens: llm.totalTokens },
    };

    return NextResponse.json(response, { status: isAllowed ? 200 : 403 });
  }

  // -------------------------------------------------------------------------
  // 5. [Knowledge Retrieval - HR/Comp] London candidate salary range & offer letters
  // Rule: Allowed: Sarah Chen (EnterpriseAdmin) (& Jay Seal). Denied: Jane, Alex, Binny, Neil.
  // -------------------------------------------------------------------------
  if (
    lowerQuery.includes('london') ||
    lowerQuery.includes('offer letter') ||
    lowerQuery.includes('salary range')
  ) {
    const domain = 'candidate_offers';
    const rlsResult = await runSessionScopedRLSQuery(user, domain);
    const isAllowed = rlsResult.recordsPermitted > 0;

    trackConnectorCall({ connectorId: 'm365-connector-candidate-offers', domain, query, user });
    trackPermissionTrimming({
      recordsScanned: rlsResult.recordsScanned,
      recordsReturned: rlsResult.recordsPermitted,
      trimRatio: rlsResult.trimRatio,
      user,
      domain,
    });

    const llm = await generateGroundedResponse({
      query,
      user,
      permittedRecords: rlsResult.permittedRecords,
      trimmedCount: rlsResult.recordsTrimmed,
      domain,
      securityInterceptNote: rlsResult.securityInterceptNote,
    });

    executionSteps.push({
      step: 1,
      name: 'Intent Classification',
      description: 'Routed to Talent Acquisition & EMEA Offer Letter Ledger.',
      status: 'completed',
      durationMs: 12,
    });
    executionSteps.push({
      step: 2,
      name: 'Supabase RLS Evaluation',
      description: isAllowed
        ? `Authorized: User '${user.name}' holds HR/EnterpriseAdmin clearance. Injected 1 offer letter record.`
        : `Policy Boundary Enforced: 1 record filtered by Supabase Row-Level Security. Role '${user.role}' lacks HR clearance.`,
      status: isAllowed ? 'completed' : 'blocked',
      durationMs: 28,
    });

    const decision: DecisionMeta = {
      type: isAllowed ? 'ALLOWED' : 'BLOCKED',
      badge: isAllowed ? 'Authorized & Grounded' : 'Policy Boundary Enforced',
      headline: isAllowed ? 'EMEA Compensation & Offer Letters Grounded' : 'RLS Trimmed: 0 Records Permitted',
      reason: isAllowed
        ? `Authorized: ${user.name} (${user.role}) has access to EMEA candidate offer letters.`
        : `Policy Boundary Enforced: EMEA candidate offer letters are restricted strictly to HR / EnterpriseAdmin (Sarah Chen). Role '${user.role}' is denied.`,
      policyRule: 'Talent Acquisition Confidentiality: Candidate remuneration letters restricted to Enterprise Operations Admin.',
      authorizedRoles: ['Sarah Chen (EnterpriseAdmin)'],
    };

    const response: OrchestrationResult = {
      success: isAllowed,
      query,
      persona: user,
      intent: 'semantic_retrieval:candidate_offers',
      connectorId: 'm365-connector-candidate-offers',
      recordsScanned: rlsResult.recordsScanned,
      recordsPermitted: rlsResult.recordsPermitted,
      trimRatio: rlsResult.trimRatio,
      securityInterceptNote: rlsResult.securityInterceptNote,
      scannedRecords: rlsResult.allCandidates,
      permittedRecords: rlsResult.permittedRecords,
      trimmedRecords: rlsResult.trimmedRecords,
      decision,
      groundedResponse: llm.content,
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: Date.now() - overallStart,
      modelUsed: llm.modelUsed,
      tokenStats: { promptTokens: llm.promptTokens, completionTokens: llm.completionTokens, totalTokens: llm.totalTokens },
    };

    return NextResponse.json(response, { status: isAllowed ? 200 : 403 });
  }

  // -------------------------------------------------------------------------
  // 7. [Knowledge Retrieval - Technical] Root cause analysis for Postgres RDS failover #8921
  // Rule: Allowed: Alex Rivera (full technical logs), Sarah/Binny/Jane (executive summary), Neil (Access Restricted).
  // -------------------------------------------------------------------------
  const domain = 'it_incidents';
  const isNeil = user.role === 'Intern' || user.clearanceLevel === 'L1';
  const rlsResult = await runSessionScopedRLSQuery(user, domain);
  const isAllowed = !isNeil;

  trackConnectorCall({ connectorId: 'm365-connector-it-incidents', domain, query, user });
  trackPermissionTrimming({
    recordsScanned: rlsResult.recordsScanned,
    recordsReturned: isAllowed ? 1 : 0,
    trimRatio: isAllowed ? 0 : 100,
    user,
    domain,
  });

  const llm = await generateGroundedResponse({
    query,
    user,
    permittedRecords: isAllowed ? rlsResult.permittedRecords : [],
    trimmedCount: isAllowed ? 0 : 1,
    domain,
    securityInterceptNote: isAllowed ? undefined : '1 record filtered by Supabase Row-Level Security.',
  });

  executionSteps.push({
    step: 1,
    name: 'Intent Classification',
    description: 'Routed to Cloud SRE Telemetry & Post-Mortem Incident Tickets.',
    status: 'completed',
    durationMs: 14,
  });
  executionSteps.push({
    step: 2,
    name: 'Tiered Incident Clearance Check',
    description: isNeil
      ? "Blocked: User holds Intern clearance. Infrastructure post-mortems restricted."
      : user.role === 'DevOpsEngineer'
      ? "Authorized: DevOpsEngineer holds deep technical telemetry clearance."
      : "Authorized: Management profile routed to Executive Summary tier.",
    status: isAllowed ? 'completed' : 'blocked',
    durationMs: 25,
  });

  const decision: DecisionMeta = {
    type: isAllowed ? 'ALLOWED' : 'BLOCKED',
    badge: isAllowed ? 'Authorized & Grounded' : 'Policy Boundary Enforced',
    headline: isAllowed
      ? user.role === 'DevOpsEngineer'
        ? 'Full Technical Root Cause Grounded'
        : 'Executive Incident Summary Grounded'
      : 'Access Restricted: Intern Profile',
    reason: isAllowed
      ? user.role === 'DevOpsEngineer'
        ? 'Authorized: Alex Rivera (Staff DevOps) granted full technical log access.'
        : `Authorized: ${user.name} granted executive incident summary.`
      : 'Policy Boundary Enforced: 1 record filtered by Supabase Row-Level Security. Interns lack infrastructure telemetry clearance.',
    policyRule: 'Incident Telemetry Tiering: Deep technical post-mortems for DevOps; executive summaries for management; restricted for interns.',
    authorizedRoles: ['Alex Rivera (Full Technical Logs)', 'Sarah Chen, Binny Lee, Jane Doe (Executive Summary)'],
  };

  const response: OrchestrationResult = {
    success: isAllowed,
    query,
    persona: user,
    intent: 'semantic_retrieval:it_incidents',
    connectorId: 'm365-connector-it-incidents',
    recordsScanned: 1,
    recordsPermitted: isAllowed ? 1 : 0,
    trimRatio: isAllowed ? 0 : 100,
    securityInterceptNote: isAllowed ? undefined : '1 record filtered by Supabase Row-Level Security.',
    scannedRecords: rlsResult.allCandidates,
    permittedRecords: isAllowed ? rlsResult.permittedRecords : [],
    trimmedRecords: isAllowed ? [] : rlsResult.allCandidates,
    decision,
    groundedResponse: llm.content,
    executionSteps,
    telemetry: getTelemetryStream(),
    latencyMs: Date.now() - overallStart,
    modelUsed: llm.modelUsed,
    tokenStats: { promptTokens: llm.promptTokens, completionTokens: llm.completionTokens, totalTokens: llm.totalTokens },
  };

  return NextResponse.json(response, { status: isAllowed ? 200 : 403 });
}
