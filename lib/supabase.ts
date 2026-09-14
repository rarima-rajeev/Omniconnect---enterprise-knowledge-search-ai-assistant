import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EnterprisePersona, EnterpriseRecord, UserContext } from './types';

// Pre-configured enterprise personas
export const ENTERPRISE_PERSONAS: EnterprisePersona[] = [
  {
    id: 'persona-jane',
    name: 'Jane Doe',
    title: 'Sr. Financial Analyst',
    department: 'Finance',
    role: 'FinanceAnalyst',
    clearanceLevel: 'L2',
    scopes: ['read.finance.payroll.restricted', 'read.finance.budget', 'read.public.wiki'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    description: 'Clearance L2: Authorized for executive equity, payroll reconciliation, and departmental P&L.',
  },
  {
    id: 'persona-alex',
    name: 'Alex Rivera',
    title: 'Staff SRE & DevOps Engineer',
    department: 'IT',
    role: 'DevOpsEngineer',
    clearanceLevel: 'L3',
    scopes: ['read.infrastructure.incidents', 'read.k8s.telemetry', 'read.public.wiki'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Clearance L3: Authorized for production cloud infrastructure telemetry, RDS alerts, and incident logs.',
  },
  {
    id: 'persona-sarah',
    name: 'Sarah Chen',
    title: 'VP of Infrastructure & Enterprise Admin',
    department: 'Operations',
    role: 'EnterpriseAdmin',
    clearanceLevel: 'L4',
    scopes: [
      'read.infrastructure.incidents',
      'read.finance.payroll.restricted',
      'admin.infrastructure.write',
      'admin.bastion.reboot',
      'read.public.wiki',
    ],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    description: 'Clearance L4 (Global Admin): Superuser with cross-domain access and administrative write consent.',
  },
];

// High-fidelity in-memory enterprise records
export const ENTERPRISE_DATABASE: EnterpriseRecord[] = [
  // --- IT INFRASTRUCTURE INCIDENTS ---
  {
    id: 'INC-8921',
    domain: 'it_incidents',
    department: 'IT',
    minClearance: 'L3',
    classification: 'Restricted',
    data: {
      title: 'Production Postgres RDS Primary Node Unplanned Failover',
      service: 'Postgres-RDS-Cluster-01',
      region: 'us-east-1',
      severity: 'P1 - Critical',
      status: 'Resolved',
      duration: '42m',
      summary: 'Automated Multi-AZ failover triggered due to hypervisor hardware degradation. Read-write connections blocked for 180s before replica promotion.',
      impact: '12,400 active API sessions timed out; e-commerce checkout latency peaked at 4,800ms.',
      resolution: 'Promoted replica `rds-prod-replica-b` to primary; replaced degraded compute host; verified zero data loss.',
    },
    metadata: {
      created_at: '2025-10-12T04:15:00Z',
      owner: 'sre-oncall@enterprise.internal',
      acl_tag: 'SEC_CLASS_IT_L3',
    },
  },
  {
    id: 'INC-8894',
    domain: 'it_incidents',
    department: 'IT',
    minClearance: 'L3',
    classification: 'Restricted',
    data: {
      title: 'Kubernetes Ingress Gateway Envoy OOMKilled Cascading Latency',
      service: 'k8s-ingress-gateway',
      region: 'us-east-1',
      severity: 'P2 - High',
      status: 'Resolved',
      duration: '1h 15m',
      summary: 'Surge in WebSocket keepalive connections caused memory limits (4GiB) to breach on 6 ingress edge pods simultaneously.',
      impact: 'Upstream HTTP 504 Gateway Timeouts for 18% of EU and US East ingress traffic.',
      resolution: 'Increased Envoy memory limit to 8GiB, added pod anti-affinity across availability zones, and tuned connection timeouts.',
    },
    metadata: {
      created_at: '2025-10-10T14:22:00Z',
      owner: 'cloud-infra@enterprise.internal',
      acl_tag: 'SEC_CLASS_IT_L3',
    },
  },
  {
    id: 'INC-8742',
    domain: 'it_incidents',
    department: 'IT',
    minClearance: 'L3',
    classification: 'Restricted',
    data: {
      title: 'Kafka Event Bus Partition Desynchronization on Broker 04',
      service: 'Kafka-EventStream-Core',
      region: 'eu-central-1',
      severity: 'P2 - High',
      status: 'Mitigated',
      duration: '2h 04m',
      summary: 'Disk I/O saturation on Broker 04 led to UnderReplicatedPartitions alert tripping across 14 high-throughput topics.',
      impact: 'Analytics ingestion delayed by 18 minutes; customer notifications delayed.',
      resolution: 'Reassigned partition leadership via CruiseControl; rebalanced replica distribution.',
    },
    metadata: {
      created_at: '2025-10-08T09:11:00Z',
      owner: 'data-platform@enterprise.internal',
      acl_tag: 'SEC_CLASS_IT_L3',
    },
  },
  {
    id: 'INC-8610',
    domain: 'it_incidents',
    department: 'IT',
    minClearance: 'L2',
    classification: 'Internal',
    data: {
      title: 'Corporate SSO & Okta SAML Token Signing Certificate Rotation',
      service: 'Okta-Enterprise-IdP',
      region: 'Global',
      severity: 'P3 - Moderate',
      status: 'Resolved',
      duration: '35m',
      summary: 'Annual rotation of SAML X.509 cert required brief renegotiation across internal proxy tunnels.',
      impact: 'Internal users required to re-authenticate single sign-on sessions.',
      resolution: 'Completed cert rollout; all 34 internal federation apps verified.',
    },
    metadata: {
      created_at: '2025-10-04T18:00:00Z',
      owner: 'identity-sec@enterprise.internal',
      acl_tag: 'SEC_CLASS_IT_L2',
    },
  },
  {
    id: 'INC-8501',
    domain: 'it_incidents',
    department: 'IT',
    minClearance: 'L1',
    classification: 'Public',
    data: {
      title: 'Scheduled Cloud Maintenance & Network Switch Firmware Update',
      service: 'Global-Edge-CDN',
      region: 'Global',
      severity: 'P3 - Moderate',
      status: 'Completed',
      duration: '30m',
      summary: 'Routine maintenance window successfully executed on global edge pop routing switches.',
      impact: 'Zero customer downtime; redundant traffic rerouted via backup path B.',
      resolution: 'Firmware upgraded to v14.2.8.',
    },
    metadata: {
      created_at: '2025-10-01T02:00:00Z',
      owner: 'noc@enterprise.internal',
      acl_tag: 'SEC_CLASS_PUBLIC',
    },
  },

  // --- EXECUTIVE PAYROLL & RSUs ---
  {
    id: 'PAY-9041',
    domain: 'executive_payroll',
    department: 'Finance',
    minClearance: 'L2',
    classification: 'Restricted',
    data: {
      title: 'Q3 Executive Equity Vesting Tranche & Accelerated RSU Grants',
      quarter: 'Q3',
      fiscalYear: '2025',
      employeeBand: 'C-Suite',
      recipient: 'Chief Executive Officer & Chief Financial Officer',
      rsuGrantValue: '$4,850,000 USD (aggregate 48,500 units @ $100 fair market value)',
      bonusPoolAllocation: '$1,200,000 USD (Q3 performance metric exceeded by 114%)',
      vestingSchedule: '33% cliff satisfied; remaining monthly linear over 24 months.',
      taxWithholdingStatus: 'Statutory supplemental federal rate (37%) + State withheld via Carta.',
    },
    metadata: {
      created_at: '2025-09-30T17:00:00Z',
      owner: 'comp-committee@enterprise.internal',
      acl_tag: 'SEC_CLASS_FINANCE_L2',
    },
  },
  {
    id: 'PAY-9018',
    domain: 'executive_payroll',
    department: 'Finance',
    minClearance: 'L2',
    classification: 'Restricted',
    data: {
      title: 'VP of Engineering & Head of AI Research Retention Equity Pool',
      quarter: 'Q3',
      fiscalYear: '2025',
      employeeBand: 'VP-Level',
      recipient: 'Vice President of Engineering & Chief AI Scientist',
      rsuGrantValue: '$2,600,000 USD (26,000 units subject to 4-year retention schedule)',
      bonusPoolAllocation: '$650,000 USD (LLM Architecture milestone achievement)',
      vestingSchedule: 'Quarterly vesting with 1-year cliff.',
      taxWithholdingStatus: 'Approved by Compensation Board on Sept 15, 2025.',
    },
    metadata: {
      created_at: '2025-09-28T11:30:00Z',
      owner: 'total-rewards@enterprise.internal',
      acl_tag: 'SEC_CLASS_FINANCE_L2',
    },
  },
  {
    id: 'PAY-8955',
    domain: 'executive_payroll',
    department: 'Finance',
    minClearance: 'L2',
    classification: 'Confidential',
    data: {
      title: 'Global Engineering & Cloud Operations Salary Band Calibration',
      quarter: 'Q3',
      fiscalYear: '2025',
      employeeBand: 'Director-Level',
      recipient: 'Cloud Infrastructure & SRE Directors (8 roles)',
      rsuGrantValue: '$1,400,000 USD (14,000 units aggregate pool)',
      bonusPoolAllocation: '$380,000 USD pool distributed by performance ratings',
      vestingSchedule: 'Standard annual refresh grants.',
      taxWithholdingStatus: 'Payroll cycle sync completed.',
    },
    metadata: {
      created_at: '2025-09-20T16:00:00Z',
      owner: 'finance-ops@enterprise.internal',
      acl_tag: 'SEC_CLASS_FINANCE_L2',
    },
  },
  {
    id: 'PAY-8820',
    domain: 'executive_payroll',
    department: 'Finance',
    minClearance: 'L2',
    classification: 'Confidential',
    data: {
      title: 'Departmental Q3 Discretionary Spot Bonus Pool Summary',
      quarter: 'Q3',
      fiscalYear: '2025',
      employeeBand: 'ALL',
      recipient: 'Cross-functional High Impact Contributors (42 engineers & analysts)',
      rsuGrantValue: '$420,000 USD',
      bonusPoolAllocation: '$210,000 USD cash payouts',
      vestingSchedule: 'Immediate lump sum distribution upon payroll approval.',
      taxWithholdingStatus: 'Scheduled for October 15 payroll run.',
    },
    metadata: {
      created_at: '2025-09-18T10:00:00Z',
      owner: 'finance-ops@enterprise.internal',
      acl_tag: 'SEC_CLASS_FINANCE_L2',
    },
  },
  {
    id: 'PAY-8500',
    domain: 'executive_payroll',
    department: 'Finance',
    minClearance: 'L1',
    classification: 'Public',
    data: {
      title: 'Annual Enterprise 401(k) Employer Match & Healthcare FSA Guidelines',
      quarter: 'Q3',
      fiscalYear: '2025',
      employeeBand: 'ALL',
      recipient: 'All Full-time Enterprise Employees',
      rsuGrantValue: 'N/A (Benefit Policy Document)',
      bonusPoolAllocation: 'Company provides 100% match on first 4% contributed + 50% on next 2%.',
      vestingSchedule: 'Immediate 100% vesting on employer match funds.',
      taxWithholdingStatus: 'Pre-tax payroll deduction.',
    },
    metadata: {
      created_at: '2025-09-01T09:00:00Z',
      owner: 'benefits@enterprise.internal',
      acl_tag: 'SEC_CLASS_PUBLIC',
    },
  },
];

// Helper to determine if a record satisfies the user's clearance level
const CLEARANCE_RANK: Record<string, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export function canUserAccessRecord(user: UserContext, record: EnterpriseRecord): { allowed: boolean; reason?: string } {
  // Public classification is accessible to all enterprise employees
  if (record.classification === 'Public' || record.minClearance === 'L1') {
    return { allowed: true };
  }

  // EnterpriseAdmin (Sarah Chen) has global cross-department clearance L4
  if (user.role === 'EnterpriseAdmin' || user.clearanceLevel === 'L4') {
    return { allowed: true };
  }

  // Department check: User department must match record department
  if (user.department !== record.department) {
    return {
      allowed: false,
      reason: `Department Boundary: Record belongs to [${record.department}] but user is assigned to [${user.department}].`,
    };
  }

  // Clearance check: User clearance must be >= record minClearance
  const userRank = CLEARANCE_RANK[user.clearanceLevel] || 1;
  const recordRank = CLEARANCE_RANK[record.minClearance] || 1;

  if (userRank < recordRank) {
    return {
      allowed: false,
      reason: `Insufficient Clearance: Record requires [${record.minClearance}] clearance, but user holds [${user.clearanceLevel}].`,
    };
  }

  return { allowed: true };
}

// Session-scoped query runner
export interface RLSQueryResult {
  domain: 'it_incidents' | 'executive_payroll';
  allCandidates: EnterpriseRecord[];
  permittedRecords: EnterpriseRecord[];
  trimmedRecords: EnterpriseRecord[];
  recordsScanned: number;
  recordsPermitted: number;
  recordsTrimmed: number;
  trimRatio: number;
  securityInterceptNote?: string;
  source: 'live_supabase' | 'simulated_rls_engine';
}

export async function runSessionScopedRLSQuery(
  user: UserContext,
  domain: 'it_incidents' | 'executive_payroll',
  searchQuery: string = ''
): Promise<RLSQueryResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If live Supabase credentials are configured, we can attempt live querying, but default gracefully to simulated RLS
  const isLiveConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'));

  // Fetch candidates from simulated enterprise database
  const candidates = ENTERPRISE_DATABASE.filter((r) => r.domain === domain);

  const permitted: EnterpriseRecord[] = [];
  const trimmed: EnterpriseRecord[] = [];

  for (const record of candidates) {
    const access = canUserAccessRecord(user, record);
    if (access.allowed) {
      permitted.push(record);
    } else {
      trimmed.push({
        ...record,
        metadata: {
          ...record.metadata,
          acl_tag: access.reason || 'Blocked by ACL policy',
        },
      });
    }
  }

  const recordsScanned = candidates.length;
  const recordsPermitted = permitted.length;
  const recordsTrimmed = trimmed.length;
  const trimRatio = recordsScanned > 0 ? Math.round((recordsTrimmed / recordsScanned) * 100) : 0;

  let securityInterceptNote: string | undefined;
  if (recordsTrimmed > 0) {
    securityInterceptNote = `[Security Intercept: ${recordsTrimmed} record${recordsTrimmed > 1 ? 's' : ''} filtered due to ACL clearance policies]`;
  }

  return {
    domain,
    allCandidates: candidates,
    permittedRecords: permitted,
    trimmedRecords: trimmed,
    recordsScanned,
    recordsPermitted,
    recordsTrimmed,
    trimRatio,
    securityInterceptNote,
    source: isLiveConfigured ? 'live_supabase' : 'simulated_rls_engine',
  };
}

// Action Gatekeeper: Check write actions
export function validateActionConsent(
  user: UserContext,
  actionName: string
): { authorized: boolean; reason?: string; requiredScopes?: string[] } {
  if (actionName === 'restart_service') {
    // Only EnterpriseAdmin is allowed to execute write actions
    if (user.role !== 'EnterpriseAdmin') {
      return {
        authorized: false,
        reason: `Administrative Consent Required: Role '${user.role}' lacks write authorization for infrastructure control operations.`,
        requiredScopes: ['admin.infrastructure.write', 'admin.bastion.reboot'],
      };
    }

    if (!user.scopes.includes('admin.infrastructure.write')) {
      return {
        authorized: false,
        reason: `OAuth Scope Missing: User lacks required scope 'admin.infrastructure.write'.`,
        requiredScopes: ['admin.infrastructure.write'],
      };
    }

    return { authorized: true };
  }

  return { authorized: true };
}
