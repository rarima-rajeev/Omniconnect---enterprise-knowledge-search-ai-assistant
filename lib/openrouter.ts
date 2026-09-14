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

  // Simulated latency
  await new Promise((res) => setTimeout(res, 160));
  const latencyMs = Date.now() - startTime;

  let simulatedContent = '';

  if (domain === 'company_directory') {
    simulatedContent = `**Elena Rostova** is the **Chief Executive Officer (CEO) and Co-Founder** of OmniConnect.

- **Background**: Elena spent 14 years directing enterprise cloud & AI infrastructure at Microsoft Azure before co-founding OmniConnect.
- **Headquarters**: Dual headquarters in Seattle, WA and San Francisco, CA.
- **Scale**: Oversees 1,450 employees across US, EMEA, and APAC development centers.

> *Source: Verified Enterprise Public Directory [DIR-001]. Public clearance (L1) verified.*`;
  } else if (domain === 'executive_payroll') {
    if (permittedRecords.length === 0) {
      simulatedContent = `**Policy Boundary Enforced**: Confidential executive compensation and equity ledgers require **FinanceDirector** or **EnterpriseAdmin** clearance.

Your current clearance profile (**${user.name}** • Role: **${user.role}** • Department: **${user.department}**) does not hold compensation clearance. 1 candidate record was pruned at the database tier via Supabase Row-Level Security (RLS).`;
    } else {
      simulatedContent = `### Q3 Executive Compensation & Equity Vesting Summary
*Source: Confidential Compensation Ledger [PAY-9041] (Restricted L4)*

1. **Elena Rostova (Chief Executive Officer)**:
   - **RSU Vesting**: **48,500 units** vested in Q3 (Fair Market Value: **$4,850,000 USD**).
   - **Performance Bonus**: **$1,200,000 USD** cash incentive for surpassing 114% of annual net revenue targets.

2. **David Vance (Vice President of Engineering)**:
   - **RSU Vesting**: **26,000 units** vested in Q3 (Fair Market Value: **$2,600,000 USD**).
   - **Milestone Bonus**: **$650,000 USD** for successful delivery of Enterprise Copilot Gateway architecture.

- **Total Executive Pool**: **$9,300,000 USD** approved by the Board Compensation Committee.
- **Grounded for**: **${user.name}** (${user.role} • Clearance: ${user.clearanceLevel}).`;
    }
  } else if (domain === 'candidate_offers') {
    if (permittedRecords.length === 0) {
      simulatedContent = `**Policy Boundary Enforced**: EMEA candidate offer letters and regional remuneration models are restricted strictly to **HR / Enterprise Administrator (Sarah Chen)**.

Your current profile (**${user.name}** • Role: **${user.role}**) is outside the Talent Acquisition governance boundary. Records filtered: 1.`;
    } else {
      simulatedContent = `### London EMEA Candidate Compensation & Offer Letters
*Source: EMEA Rewards & Calibration Record [HR-LONDON-88]*

- **Location**: London, United Kingdom (EMEA Hub)
- **Approved Engineering Salary Bands**:
  - **L5 Senior Software Engineer**: £115,000 – £140,000 GBP base + £45,000 equity grant.
  - **L6 Staff SRE**: £145,000 – £175,000 GBP base + £60,000 equity grant.
- **Recent Offers Issued (Q3/Q4)**:
  1. **Candidate A. Davies** (Principal Architect): £165,000 base + £60,000 RSU grant (**Accepted Oct 1**).
  2. **Candidate S. Patel** (Staff ML Engineer): £152,000 base + £50,000 sign-on bonus (**Offer Sent Oct 2**).

- **Grounded for**: **${user.name}** (${user.role} • Clearance: ${user.clearanceLevel}).`;
    }
  } else if (domain === 'it_incidents') {
    if (user.role === 'Intern' || user.clearanceLevel === 'L1') {
      simulatedContent = `**Access Restricted**: Internal cloud infrastructure post-mortems and incident root-cause tickets are restricted to engineering and management staff.

Intern profiles do not hold infrastructure telemetry clearance.`;
    } else if (user.role === 'DevOpsEngineer' || user.role === 'SuperAdmin' || user.role === 'SystemAdmin') {
      // Full technical logs for DevOps
      simulatedContent = `### Technical Post-Mortem: Postgres RDS Failover Incident #8921
*Source: Production Cloud SRE Telemetry [INC-8921] (Severity: P1 - Critical)*

- **Affected Target**: \`Postgres-RDS-Cluster-01\` (us-east-1a -> us-east-1b)
- **Total Duration**: 42 minutes | **Customer Impact**: 0% data loss (180s write pause)
- **Technical Root Cause**:
  Hypervisor hardware ECC memory degradation triggered an unexpected kernel panic on primary node \`rds-prod-primary-a\`. Automated Multi-AZ health monitors tripped within 12 seconds.
- **SRE Remediation & Failover Sequence**:
  1. Replica \`rds-prod-replica-b\` promoted to primary master.
  2. DNS CNAME flip propagated across Envoy ingress edge in 45s.
  3. WAL (Write-Ahead Log) sequence synchronicity validated; zero corrupt transactions found.
  4. Degraded compute host retired and replaced by AWS support.

- **Audited for**: **${user.name}** (${user.role} • Deep Technical Logs Authorized).`;
    } else {
      // Executive summary for Jane Doe & Sarah Chen
      simulatedContent = `### Executive Incident Summary: Database Failover #8921
*Source: Cloud Infrastructure Operational Report [INC-8921]*

- **Service Affected**: Enterprise Postgres Database Cluster (US East)
- **Severity**: P1 - High Availability Event (Resolved in 42 minutes)
- **Executive Summary**:
  The primary database cluster experienced an automated failover to its secondary standby node due to an underlying cloud hardware degradation. Automated redundancy mechanisms rerouted all production traffic with **zero customer data loss** and normal operations resumed within the standard SLA window.

- **Audited for**: **${user.name}** (${user.role} • Executive Summary View).`;
    }
  } else {
    simulatedContent = `Retrieved ${permittedRecords.length} records matching your query within domain '${domain}'.`;
  }

  return {
    content: simulatedContent,
    modelUsed: 'OmniConnect Grounded Orchestrator',
    latencyMs,
    ttftMs: Math.round(latencyMs * 0.35),
    promptTokens: 310,
    completionTokens: Math.round(simulatedContent.length / 3.8),
    totalTokens: 310 + Math.round(simulatedContent.length / 3.8),
    isSimulated: true,
  };
}
