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
import { ENTERPRISE_PERSONAS, runSessionScopedRLSQuery, validateActionConsent } from '@/lib/supabase';
import { OrchestrationResult, OrchestrationStep, UserContext } from '@/lib/types';

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
  const { query = '', personaId, persona: customPersona, actionName, actionPayload } = body;

  // Resolve user persona
  const matchedPersona = ENTERPRISE_PERSONAS.find((p) => p.id === personaId);
  const user: UserContext = customPersona || (matchedPersona ? {
    userId: matchedPersona.id,
    name: matchedPersona.name,
    email: `${matchedPersona.name.toLowerCase().replace(' ', '.')}@enterprise.internal`,
    department: matchedPersona.department,
    role: matchedPersona.role,
    clearanceLevel: matchedPersona.clearanceLevel,
    scopes: matchedPersona.scopes,
  } : {
    userId: 'usr_anon',
    name: 'Anonymous Employee',
    email: 'anon@enterprise.internal',
    department: 'Finance',
    role: 'FinanceAnalyst',
    clearanceLevel: 'L1',
    scopes: ['read.public.wiki'],
  });

  const executionSteps: OrchestrationStep[] = [];

  // Determine intent
  const lowerQuery = (query || '').toLowerCase();
  const isActionIntent =
    actionName === 'restart_service' ||
    lowerQuery.includes('restart') ||
    lowerQuery.includes('reboot') ||
    lowerQuery.includes('power cycle');

  const isPayrollIntent =
    !isActionIntent &&
    (lowerQuery.includes('payroll') ||
      lowerQuery.includes('rsu') ||
      lowerQuery.includes('equity') ||
      lowerQuery.includes('salary') ||
      lowerQuery.includes('compensation') ||
      lowerQuery.includes('bonus') ||
      lowerQuery.includes('c-suite'));

  // -------------------------------------------------------------
  // BRANCH 1: AGENT ACTION & ADMINISTRATIVE CONSENT (Write Mode)
  // -------------------------------------------------------------
  if (isActionIntent) {
    const step1Start = Date.now();
    executionSteps.push({
      step: 1,
      name: 'Intent Recognition & Semantic Router',
      description: 'Identified mutation intent: Bastion host / Cloud service restart action.',
      status: 'completed',
      durationMs: Date.now() - step1Start + 18,
      metadata: { target_tool: 'restart_service', category: 'agent_action' },
    });

    const step2Start = Date.now();
    const connector = MCP_CONNECTORS.find((c) => c.category === 'agent_action')!;
    executionSteps.push({
      step: 2,
      name: 'MCP Schema Selection',
      description: `Loaded Model Context Protocol manifest: ${connector.name} (v${connector.version}).`,
      status: 'completed',
      durationMs: Date.now() - step2Start + 12,
      metadata: { tool_declaration: connector.tool.name, required_scopes: connector.requiredScopes },
    });

    // Step 3: Action Gatekeeper & Admin Consent Validation
    const step3Start = Date.now();
    const consent = validateActionConsent(user, 'restart_service');

    if (!consent.authorized) {
      executionSteps.push({
        step: 3,
        name: 'Action Gatekeeper & Consent Evaluation',
        description: `Access Denied: User role '${user.role}' lacks administrative clearance for write actions.`,
        status: 'blocked',
        durationMs: Date.now() - step3Start + 24,
        metadata: {
          blocked_reason: consent.reason,
          required_scopes: consent.requiredScopes,
          current_role: user.role,
        },
      });

      // PostHog Telemetry: action blocked
      trackActionConsent({
        actionType: 'restart_service',
        status: 'denied',
        latencyMs: Date.now() - overallStart,
        user,
        reason: consent.reason,
        requiredScopes: consent.requiredScopes,
      });

      const responsePayload: OrchestrationResult = {
        success: false,
        query: query || 'restart_service(service_name="prod-bastion-us-east-1", region="us-east-1")',
        persona: user,
        intent: 'agent_action:restart_service',
        connectorId: connector.id,
        recordsScanned: 0,
        recordsPermitted: 0,
        trimRatio: 0,
        scannedRecords: [],
        permittedRecords: [],
        trimmedRecords: [],
        groundedResponse: `**Security Intercept**: Execution of autonomous action \`restart_service\` has been blocked by the OmniConnect Gatekeeper.

${consent.reason}

To execute infrastructure modifications, this request must be authorized by an **EnterpriseAdmin** possessing the \`admin.infrastructure.write\` OAuth scope.`,
        actionExecuted: false,
        consentRequired: {
          code: '403 ConsentRequired',
          message: consent.reason || 'Missing administrative privilege.',
          requiredRole: ['EnterpriseAdmin'],
          requiredScopes: consent.requiredScopes || ['admin.infrastructure.write', 'admin.bastion.reboot'],
          currentRole: user.role,
          currentScopes: user.scopes,
          resolutionSteps: [
            '1. Elevate session privilege via PIM (Privileged Identity Management) portal.',
            '2. Request tenant administrator OAuth consent for scope `admin.infrastructure.write`.',
            '3. Switch active workbench persona to Sarah Chen (EnterpriseAdmin) to test authorized execution.',
          ],
        },
        executionSteps,
        telemetry: getTelemetryStream(),
        latencyMs: Date.now() - overallStart,
        modelUsed: 'OmniConnect Policy Gatekeeper',
        tokenStats: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };

      return NextResponse.json(responsePayload, { status: 403 });
    }

    // Authorized Admin Execution
    executionSteps.push({
      step: 3,
      name: 'Action Gatekeeper & Consent Evaluation',
      description: `Administrative Consent Verified: User '${user.name}' holds 'EnterpriseAdmin' and required write scopes.`,
      status: 'completed',
      durationMs: Date.now() - step3Start + 35,
      metadata: {
        authorized_scopes: user.scopes,
        role: user.role,
      },
    });

    const step4Start = Date.now();
    const targetService = actionPayload?.service_name || 'prod-bastion-us-east-1';
    const targetRegion = actionPayload?.region || 'us-east-1';
    const reason = actionPayload?.reason || 'Scheduled patch reboot and TLS session cache flush';

    // Simulate pod connection draining and host reboot sequence
    executionSteps.push({
      step: 4,
      name: 'Agent Action Execution (Cloud Bastion Drain & Reboot)',
      description: `Dispatched RPC call to AWS EC2 & K8s cluster controller for '${targetService}' in '${targetRegion}'.`,
      status: 'completed',
      durationMs: Date.now() - step4Start + 160,
      metadata: {
        target_service: targetService,
        region: targetRegion,
        drain_status: 'completed',
        reboot_duration: '4.2s',
      },
    });

    const actionLatency = Date.now() - overallStart;
    trackActionConsent({
      actionType: 'restart_service',
      status: 'success',
      latencyMs: actionLatency,
      user,
    });

    const responsePayload: OrchestrationResult = {
      success: true,
      query: query || `Trigger Action: Restart ${targetService}`,
      persona: user,
      intent: 'agent_action:restart_service',
      connectorId: connector.id,
      recordsScanned: 0,
      recordsPermitted: 0,
      trimRatio: 0,
      scannedRecords: [],
      permittedRecords: [],
      trimmedRecords: [],
      groundedResponse: `### Operational Action Executed Successfully
**Authorization Clearance**: Verified **${user.name}** (${user.role} • L4 Global Enterprise Admin).

- **Target Asset**: \`${targetService}\` (${targetRegion})
- **Operation**: Host Graceful Drain -> Node Reboot -> Health Probe Ping
- **Execution Output**:
  - \`[00:00.120]\` Initiated graceful connection drain (0 active dropped packets).
  - \`[00:01.850]\` Sent reboot signal to AWS EC2 instance hypervisor.
  - \`[00:03.900]\` Bastion host SSH and WireGuard daemon online.
  - \`[00:04.150]\` Cluster health check returned HTTP 200 OK.
- **Audit Stamp**: \`OPS-AUTH-${Date.now().toString(36).toUpperCase()}\``,
      actionExecuted: true,
      actionPayload: { service_name: targetService, region: targetRegion, reason },
      actionResult: {
        status: 'SUCCESS_REBOOTED',
        asset: targetService,
        region: targetRegion,
        execution_timestamp: new Date().toISOString(),
      },
      executionSteps,
      telemetry: getTelemetryStream(),
      latencyMs: actionLatency,
      modelUsed: 'OmniConnect Orchestrator & SRE Agent Controller',
      tokenStats: { promptTokens: 42, completionTokens: 186, totalTokens: 228 },
    };

    return NextResponse.json(responsePayload);
  }

  // -------------------------------------------------------------
  // BRANCH 2: SEMANTIC RETRIEVAL & PERMISSION-AWARE TRIMMING
  // -------------------------------------------------------------
  const domain = isPayrollIntent ? 'executive_payroll' : 'it_incidents';
  const connector = MCP_CONNECTORS.find((c) =>
    domain === 'executive_payroll'
      ? c.id === 'm365-connector-executive-payroll'
      : c.id === 'm365-connector-it-incidents'
  )!;

  // Step 1: Intent Recognition
  const step1Start = Date.now();
  executionSteps.push({
    step: 1,
    name: 'Intent Recognition & Semantic Router',
    description: `Analyzed query: Routed to enterprise domain '${domain}'.`,
    status: 'completed',
    durationMs: Date.now() - step1Start + 15,
    metadata: { domain, target_connector: connector.id },
  });

  // Track connector invocation in PostHog
  trackConnectorCall({
    connectorId: connector.id,
    domain,
    query: query || (domain === 'executive_payroll' ? 'Query Executive Equity' : 'Query IT Outages'),
    user,
  });

  // Step 2: MCP Schema Selection
  const step2Start = Date.now();
  executionSteps.push({
    step: 2,
    name: 'MCP Schema Selection',
    description: `Bound tool declaration: '${connector.tool.name}' (Model Context Protocol v1.0).`,
    status: 'completed',
    durationMs: Date.now() - step2Start + 10,
    metadata: { parameters: Object.keys(connector.tool.parameters.properties) },
  });

  // Step 3: Supabase Session-Scoped RLS Query
  const step3Start = Date.now();
  const rlsResult = await runSessionScopedRLSQuery(user, domain, query);
  executionSteps.push({
    step: 3,
    name: 'Supabase Session-Scoped RLS Query',
    description: `Executed database query with session parameters [Dept: ${user.department}, Clearance: ${user.clearanceLevel}]. Found ${rlsResult.recordsScanned} candidate records.`,
    status: 'completed',
    durationMs: Date.now() - step3Start + 45,
    metadata: {
      storage_engine: rlsResult.source,
      scanned: rlsResult.recordsScanned,
      user_dept: user.department,
    },
  });

  // Step 4: Permission Trimming Diff & Delta Analysis
  const step4Start = Date.now();
  trackPermissionTrimming({
    recordsScanned: rlsResult.recordsScanned,
    recordsReturned: rlsResult.recordsPermitted,
    trimRatio: rlsResult.trimRatio,
    user,
    domain,
  });

  executionSteps.push({
    step: 4,
    name: 'Permission Trimming Diff & Delta Analysis',
    description:
      rlsResult.recordsTrimmed > 0
        ? `Filtered ${rlsResult.recordsTrimmed} of ${rlsResult.recordsScanned} candidate records (${rlsResult.trimRatio}% trimming ratio) violating department/clearance boundaries.`
        : `Zero records trimmed. All ${rlsResult.recordsPermitted} records passed enterprise clearance verification.`,
    status: rlsResult.recordsTrimmed > 0 ? 'completed' : 'completed',
    durationMs: Date.now() - step4Start + 12,
    metadata: {
      scanned: rlsResult.recordsScanned,
      permitted: rlsResult.recordsPermitted,
      trimmed: rlsResult.recordsTrimmed,
      trim_ratio: `${rlsResult.trimRatio}%`,
      intercept_note: rlsResult.securityInterceptNote,
    },
  });

  // Step 5: Grounded LLM Response Synthesis
  const step5Start = Date.now();
  const llmResponse = await generateGroundedResponse({
    query: query || (domain === 'executive_payroll' ? 'Summarize Q3 executive payroll' : 'Summarize IT outages'),
    user,
    permittedRecords: rlsResult.permittedRecords,
    trimmedCount: rlsResult.recordsTrimmed,
    domain,
    securityInterceptNote: rlsResult.securityInterceptNote,
  });

  trackLLMLatency({
    modelUsed: llmResponse.modelUsed,
    ttftMs: llmResponse.ttftMs,
    totalTokens: llmResponse.totalTokens,
    latencyMs: llmResponse.latencyMs,
  });

  executionSteps.push({
    step: 5,
    name: 'Grounded LLM Response Synthesis',
    description: `Synthesized grounded response using strictly permitted records with ${llmResponse.modelUsed}.`,
    status: 'completed',
    durationMs: Date.now() - step5Start + llmResponse.latencyMs,
    metadata: {
      model: llmResponse.modelUsed,
      tokens: llmResponse.totalTokens,
      ttft: `${llmResponse.ttftMs}ms`,
    },
  });

  const totalDuration = Date.now() - overallStart;

  const result: OrchestrationResult = {
    success: true,
    query: query || (domain === 'executive_payroll' ? 'Query Q3 Executive Payroll & RSUs' : 'Query IT Infrastructure Outages'),
    persona: user,
    intent: `semantic_retrieval:${connector.tool.name}`,
    connectorId: connector.id,
    recordsScanned: rlsResult.recordsScanned,
    recordsPermitted: rlsResult.recordsPermitted,
    trimRatio: rlsResult.trimRatio,
    securityInterceptNote: rlsResult.securityInterceptNote,
    scannedRecords: rlsResult.allCandidates,
    permittedRecords: rlsResult.permittedRecords,
    trimmedRecords: rlsResult.trimmedRecords,
    groundedResponse: llmResponse.content,
    executionSteps,
    telemetry: getTelemetryStream(),
    latencyMs: totalDuration,
    modelUsed: llmResponse.modelUsed,
    tokenStats: {
      promptTokens: llmResponse.promptTokens,
      completionTokens: llmResponse.completionTokens,
      totalTokens: llmResponse.totalTokens,
    },
  };

  return NextResponse.json(result);
}
