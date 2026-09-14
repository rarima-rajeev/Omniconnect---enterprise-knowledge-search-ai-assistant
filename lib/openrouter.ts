import { EnterpriseRecord, UserContext } from './types';

export interface LLMResponse {
  content: string;
  modelUsed: string;
  latencyMs: number;
  ttftMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isSimulated: boolean;
}

export async function generateGroundedResponse(params: {
  query: string;
  user: UserContext;
  permittedRecords: EnterpriseRecord[];
  trimmedCount: number;
  domain: string;
  securityInterceptNote?: string;
}): Promise<LLMResponse> {
  const { query, user, permittedRecords, trimmedCount, domain, securityInterceptNote } = params;
  const startTime = Date.now();

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const recordsContext = permittedRecords
    .map((r, idx) => {
      const dataStr = Object.entries(r.data)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n');
      return `[Record #${idx + 1} | ID: ${r.id} | Department: ${r.department} | Classification: ${r.classification}]\n${dataStr}`;
    })
    .join('\n\n');

  const systemPrompt = `You are OmniConnect Copilot, an enterprise AI assistant embedded inside Microsoft 365 Copilot.
You adhere strictly to Row Level Security (RLS) enterprise boundaries.
User: ${user.name} (${user.department} Department, Role: ${user.role}, Clearance Level: ${user.clearanceLevel}).

Security Policy:
1. ONLY utilize the records explicitly provided below in the PERMITTED ENTERPRISE RECORDS section.
2. If the user asks about records outside their clearance or department, do not fabricate or speculate.
3. Reference record IDs (e.g. [INC-8921], [PAY-9041]) when stating facts.
4. If records were trimmed by ACL policies (${trimmedCount} records filtered), acknowledge that enterprise policy withheld restricted records.

PERMITTED ENTERPRISE RECORDS:
${recordsContext || '(No records matched user clearance level and department ACLs)'}
`;

  // Check if OpenRouter is configured
  if (openRouterKey && !openRouterKey.includes('sk-or-v1-...')) {
    try {
      const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://omniconnect.internal',
          'X-Title': 'OmniConnect Copilot Gateway',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const latencyMs = Date.now() - startTime;
        const choice = data.choices?.[0]?.message?.content || 'No response generated.';
        return {
          content: choice,
          modelUsed: `OpenRouter (${model})`,
          latencyMs,
          ttftMs: Math.round(latencyMs * 0.45),
          promptTokens: data.usage?.prompt_tokens || Math.round(systemPrompt.length / 4),
          completionTokens: data.usage?.completion_tokens || Math.round(choice.length / 4),
          totalTokens: data.usage?.total_tokens || Math.round((systemPrompt.length + choice.length) / 4),
          isSimulated: false,
        };
      }
    } catch (err) {
      console.warn('[OpenRouter] Falling back to simulated LLM engine:', err);
    }
  }

  // Check if Gemini is configured
  if (geminiKey && !geminiKey.includes('AIzaSy...')) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const latencyMs = Date.now() - startTime;
        const choice =
          data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated from Gemini.';
        return {
          content: choice,
          modelUsed: 'Google Gemini 1.5 Pro',
          latencyMs,
          ttftMs: Math.round(latencyMs * 0.4),
          promptTokens: data.usageMetadata?.promptTokenCount || Math.round(systemPrompt.length / 4),
          completionTokens: data.usageMetadata?.candidatesTokenCount || Math.round(choice.length / 4),
          totalTokens: data.usageMetadata?.totalTokenCount || Math.round((systemPrompt.length + choice.length) / 4),
          isSimulated: false,
        };
      }
    } catch (err) {
      console.warn('[Gemini] Falling back to simulated LLM engine:', err);
    }
  }

  // High-fidelity zero-crash simulated inference
  // Realistic latency simulation (180ms - 320ms)
  await new Promise((res) => setTimeout(res, 220));
  const latencyMs = Date.now() - startTime;

  let simulatedContent = '';

  if (domain === 'it_incidents') {
    if (permittedRecords.length === 0) {
      simulatedContent = `**Enterprise Access Notice**: No cloud infrastructure incident records are accessible under your current clearance profile (${user.name} • ${user.department} • Clearance: ${user.clearanceLevel}).

All candidate incident tickets were intercepted and pruned at the database tier in accordance with corporate Row Level Security policies. If this is an active production emergency, please contact the IT Security Operations Center (SOC) or have an authorized DevOps engineer query the infrastructure gateway.`;
    } else {
      const p1 = permittedRecords.find((r) => r.id === 'INC-8921');
      const p2 = permittedRecords.find((r) => r.id === 'INC-8894');
      const p3 = permittedRecords.find((r) => r.id === 'INC-8742');

      simulatedContent = `### Cloud Infrastructure Health & Outage Report
**Grounded Context**: Retrieved **${permittedRecords.length} authorized incident records** for **${user.name}** (${user.department} / ${user.role}).

1. **Production Postgres RDS Failover** [[INC-8921]]:
   - **Severity**: P1 - Critical | **Service**: \`Postgres-RDS-Cluster-01\` (us-east-1)
   - **Status**: Resolved (Impact: 42m duration, 12,400 active sessions affected).
   - **Root Cause**: Hypervisor hardware degradation prompted automatic Multi-AZ failover to replica \`rds-prod-replica-b\`. Data loss: 0%.

2. **Kubernetes Ingress Gateway Envoy Degradation** [[INC-8894]]:
   - **Severity**: P2 - High | **Service**: \`k8s-ingress-gateway\` (us-east-1)
   - **Status**: Resolved (Envoy proxy OOMKilled under WebSocket connection spike; memory limit increased to 8GiB).

3. **Kafka EventStream Broker 04 Desync** [[INC-8742]]:
   - **Severity**: P2 - High | **Service**: \`Kafka-EventStream-Core\` (eu-central-1)
   - **Status**: Mitigated via CruiseControl partition leadership rebalancing.

${
  securityInterceptNote
    ? `\n> **Observability Advisory**: ${securityInterceptNote}. Any cross-department or classified records were filtered prior to prompt synthesis.`
    : ''
}`;
    }
  } else if (domain === 'executive_payroll') {
    if (permittedRecords.length === 0) {
      simulatedContent = `**Access Denied**: Executive compensation, RSU grants, and bonus pool tables are strictly restricted to the Finance department under SEC & corporate governance policies.

Your user profile (**${user.name}**, Department: **${user.department}**) does not have clearance to inspect equity ledger entries.`;
    } else {
      const pay1 = permittedRecords.find((r) => r.id === 'PAY-9041');
      const pay2 = permittedRecords.find((r) => r.id === 'PAY-9018');
      const pay3 = permittedRecords.find((r) => r.id === 'PAY-8955');

      simulatedContent = `### Q3 Executive Compensation & Equity Vesting Summary
**Clearance Verified**: Authorized Finance session for **${user.name}** (${user.role} • Clearance: ${user.clearanceLevel}).

1. **C-Suite RSU Vesting Tranche** [[PAY-9041]]:
   - **Aggregate Grant Value**: $4,850,000 USD (48,500 units @ $100 FMV).
   - **Recipients**: Chief Executive Officer & Chief Financial Officer.
   - **Bonus Allocation**: $1,200,000 USD (Q3 performance factor: 114%).
   - **Status**: 33% cliff satisfied; linear monthly vesting over 24 months.

2. **VP Engineering & Head of AI Retention Equity** [[PAY-9018]]:
   - **Grant Value**: $2,600,000 USD (26,000 units subject to 4-year retention schedule).
   - **Incentive**: Retention bonus of $650,000 USD linked to LLM Architecture rollout.

3. **Director-Level Salary Band Calibration** [[PAY-8955]]:
   - **Total Pool**: $1,400,000 USD equity + $380,000 USD merit performance pool across 8 director positions.

${
  securityInterceptNote
    ? `\n> **Observability Advisory**: ${securityInterceptNote}. Non-financial or unauthorized ledger rows were purged at the query boundary.`
    : ''
}`;
    }
  } else {
    simulatedContent = `Retrieved ${permittedRecords.length} records matching your query within the '${domain}' enterprise domain.`;
  }

  const promptTokens = Math.round(systemPrompt.length / 3.8);
  const completionTokens = Math.round(simulatedContent.length / 3.8);

  return {
    content: simulatedContent,
    modelUsed: 'OmniConnect Enterprise Orchestrator (Mock Fallback Engine)',
    latencyMs,
    ttftMs: Math.round(latencyMs * 0.35),
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    isSimulated: true,
  };
}
