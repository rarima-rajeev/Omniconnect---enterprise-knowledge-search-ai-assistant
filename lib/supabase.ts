import { EnterprisePersona, EnterpriseRecord, UserContext } from './types';

// The 6 enterprise personas requested by the user
export const ENTERPRISE_PERSONAS: EnterprisePersona[] = [
  {
    id: 'persona-jane',
    name: 'Jane Doe',
    title: 'Finance Director',
    department: 'Finance',
    role: 'FinanceDirector',
    clearanceLevel: 'L4',
    levelDisplay: 'L4',
    scopes: [
      'finance.wire.approve',
      'read.finance.payroll',
      'read.finance.all',
      'read.public.directory',
    ],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    description: 'Finance Director (L4). Holds commercial disbursement and wire transfer approval authority ($100k+).',
  },
  {
    id: 'persona-alex',
    name: 'Alex Rivera',
    title: 'Staff DevOps & SRE Engineer',
    department: 'IT',
    role: 'DevOpsEngineer',
    clearanceLevel: 'L3',
    levelDisplay: 'L3',
    scopes: ['read.infrastructure.incidents', 'read.infrastructure.telemetry', 'read.public.directory'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Staff DevOps Engineer (L3). Authorized for deep technical cloud telemetry and RDS failover post-mortems.',
  },
  {
    id: 'persona-sarah',
    name: 'Sarah Chen',
    title: 'Enterprise Operations Administrator',
    department: 'Operations',
    role: 'EnterpriseAdmin',
    clearanceLevel: 'L4',
    levelDisplay: 'L4',
    scopes: [
      'read.hr.compensation.emea',
      'read.finance.payroll',
      'read.operations.all',
      'read.public.directory',
    ],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    description: 'Enterprise Operations Administrator (L4). Authorized for global HR/Comp calibration and EMEA offer letters.',
  },
  {
    id: 'persona-binny',
    name: 'Binny Lee',
    title: 'Head of Cloud Infrastructure & Super Admin',
    department: 'Infrastructure',
    role: 'SuperAdmin',
    clearanceLevel: 'L6',
    levelDisplay: 'L6',
    scopes: [
      'Cloud.Infrastructure.Write',
      'admin.bastion.reboot',
      'admin.crm.delete',
      'read.infrastructure.all',
      'read.public.directory',
    ],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    description: 'Super Admin (L6). Full write privileges for cloud infrastructure reboots and CRM database mutations.',
  },
  {
    id: 'persona-neil',
    name: 'Neil Wright',
    title: 'Engineering Intern',
    department: 'General',
    role: 'Intern',
    clearanceLevel: 'L1',
    levelDisplay: 'Intern',
    scopes: ['read.public.directory', 'read.public.handbook'],
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    description: 'Engineering Intern (General). Read-only access to public corporate directory and general documentation.',
  },
  {
    id: 'persona-jay',
    name: 'Jay Seal',
    title: 'OmniConnect Platform Administrator',
    department: 'System',
    role: 'SystemAdmin',
    clearanceLevel: 'L6',
    levelDisplay: 'Super Admin',
    isSystemAdmin: true,
    scopes: [
      'root.platform.admin',
      'read.observability.deck',
      'read.telemetry.all',
      'read.all.domains',
      'Cloud.Infrastructure.Write',
    ],
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    description: 'OmniConnect Platform System Admin. Root privileges and exclusive access to the Admin Observability Deck (/admin).',
  },
];

// Enterprise Records for the 7 scenarios
export const ENTERPRISE_DATABASE: EnterpriseRecord[] = [
  // --- PUBLIC DIRECTORY (L1 Public - Accessible to ALL, including Intern Neil) ---
  {
    id: 'DIR-001',
    domain: 'company_directory',
    department: 'General',
    minClearance: 'L1',
    classification: 'Public',
    data: {
      title: 'Executive Leadership Profile: Chief Executive Officer',
      executive_name: 'Elena Rostova',
      executive_role: 'Chief Executive Officer & Co-Founder',
      bio: 'Elena Rostova co-founded OmniConnect in 2021 after 14 years driving enterprise cloud & AI gateway architecture at Microsoft Azure.',
      headquarters: 'Seattle, WA & San Francisco, CA',
      founded_year: '2021',
      total_employees: '1,450 globally',
    },
    metadata: {
      created_at: '2025-01-01T00:00:00Z',
      owner: 'corporate-comms@enterprise.internal',
      acl_tag: 'SEC_CLASS_PUBLIC_ALL',
    },
  },

  // --- EXECUTIVE PAYROLL (Permitted for Jane Doe & Sarah Chen. Masked for Alex, Binny, Neil) ---
  {
    id: 'PAY-9041',
    domain: 'executive_payroll',
    department: 'Finance',
    minClearance: 'L4',
    classification: 'Restricted',
    data: {
      title: 'Q3 Executive Equity Vesting Tranche & Accelerated RSU Grants',
      recipient_ceo: 'Elena Rostova (CEO): 48,500 RSUs ($4,850,000 USD fair value) + $1,200,000 performance bonus.',
      recipient_vp_eng: 'David Vance (VP of Engineering): 26,000 RSUs ($2,600,000 USD) + $650,000 milestone bonus.',
      aggregate_executive_pool: '$9,300,000 USD total equity and bonus distributions in Q3.',
      board_resolution: 'Approved by the Compensation Committee on Sept 28, 2025.',
    },
    metadata: {
      created_at: '2025-09-30T17:00:00Z',
      owner: 'comp-committee@enterprise.internal',
      acl_tag: 'SEC_CLASS_EXEC_COMP_L4',
    },
  },

  // --- HR / COMPENSATION: LONDON OFFER LETTERS (Permitted ONLY for Sarah Chen - HR/Comp) ---
  {
    id: 'HR-LONDON-88',
    domain: 'candidate_offers',
    department: 'Operations',
    minClearance: 'L4',
    classification: 'Confidential',
    data: {
      title: 'London EMEA Engineering Compensation Calibration & Recent Offer Letters',
      location: 'London, United Kingdom (EMEA Hub)',
      salary_bands: 'L5 Senior Software Engineer: £115,000 – £140,000 GBP base + £45,000 equity. L6 Staff SRE: £145,000 – £175,000 GBP base.',
      recent_candidate_offers: [
        'Candidate A. Davies (Principal Architect): £165,000 base + £60,000 RSU grant (Accepted Oct 1)',
        'Candidate S. Patel (Staff ML Engineer): £152,000 base + £50,000 sign-on (Offer Sent Oct 2)',
      ],
      recruiter_notes: 'Competitive calibration benchmarked against London AI market standards.',
    },
    metadata: {
      created_at: '2025-10-02T11:00:00Z',
      owner: 'emea-rewards@enterprise.internal',
      acl_tag: 'SEC_CLASS_HR_COMP_L4',
    },
  },

  // --- TECHNICAL INFRASTRUCTURE: RDS FAILOVER INCIDENT #8921 ---
  {
    id: 'INC-8921',
    domain: 'it_incidents',
    department: 'IT',
    minClearance: 'L3',
    classification: 'Restricted',
    data: {
      title: 'Production Postgres RDS Primary Node Unplanned Failover (Incident #8921)',
      service: 'Postgres-RDS-Cluster-01 (us-east-1)',
      severity: 'P1 - Critical',
      status: 'Resolved',
      duration: '42m',
      technical_root_cause:
        'Hypervisor hardware ECC memory degradation triggered kernel panic on primary node `rds-prod-primary-a`. Automated Multi-AZ failover engaged.',
      technical_resolution:
        'Replica `rds-prod-replica-b` promoted to primary. Connection pool drain completed in 180s. WAL replay logs verified with 0% data loss.',
      executive_summary:
        'Database cluster experienced an automated 42-minute planned failover due to underlying cloud hardware degradation. Traffic rerouted seamlessly with zero customer data loss.',
    },
    metadata: {
      created_at: '2025-10-12T04:15:00Z',
      owner: 'sre-oncall@enterprise.internal',
      acl_tag: 'SEC_CLASS_IT_L3',
    },
  },
];

export function canUserAccessDomain(user: UserContext, domain: string): { allowed: boolean; reason?: string } {
  // Public directory is accessible to everyone
  if (domain === 'company_directory') {
    return { allowed: true };
  }

  // System Admin (Jay Seal) can inspect all domains
  if (user.role === 'SystemAdmin') {
    return { allowed: true };
  }

  // Intern Neil has only public clearance
  if (user.role === 'Intern' || user.clearanceLevel === 'L1') {
    return {
      allowed: false,
      reason: `Policy Boundary Enforced: User '${user.name}' holds Intern clearance. Access to '${domain}' is restricted.`,
    };
  }

  // Executive Payroll: Allowed for Jane Doe (FinanceDirector) & Sarah Chen (EnterpriseAdmin)
  // Denied / Masked for: Alex Rivera, Binny Lee, Neil Wright
  if (domain === 'executive_payroll') {
    if (user.role === 'FinanceDirector' || user.role === 'EnterpriseAdmin') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Policy Boundary Enforced: Confidential executive equity ledgers require FinanceDirector or EnterpriseAdmin clearance. Role '${user.role}' lacks clearance.`,
    };
  }

  // Candidate Offers (London HR/Comp): Allowed ONLY for Sarah Chen (EnterpriseAdmin)
  // Denied for: Jane, Alex, Binny, Neil
  if (domain === 'candidate_offers') {
    if (user.role === 'EnterpriseAdmin') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Policy Boundary Enforced: EMEA candidate offer letters are restricted to HR / EnterpriseAdmin (Sarah Chen). Role '${user.role}' is denied.`,
    };
  }

  // IT Incidents:
  // Alex Rivera (DevOpsEngineer L3) gets full technical logs.
  // Sarah Chen, Binny Lee, Jane Doe get executive summary.
  // Neil Wright is restricted.
  if (domain === 'it_incidents') {
    return { allowed: true };
  }

  return { allowed: true };
}

// Session-Scoped RLS Query runner
export async function runSessionScopedRLSQuery(user: UserContext, domain: string) {
  const candidates = ENTERPRISE_DATABASE.filter((r) => r.domain === domain);
  const permitted: EnterpriseRecord[] = [];
  const trimmed: EnterpriseRecord[] = [];

  const domainAccess = canUserAccessDomain(user, domain);

  for (const record of candidates) {
    if (domainAccess.allowed) {
      permitted.push(record);
    } else {
      trimmed.push({
        ...record,
        metadata: {
          ...record.metadata,
          acl_tag: domainAccess.reason || 'Blocked by Supabase RLS policy',
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
    securityInterceptNote = `Policy Boundary Enforced: ${recordsTrimmed} record${
      recordsTrimmed > 1 ? 's' : ''
    } filtered by Supabase Row-Level Security.`;
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
    source: 'simulated_rls_engine' as const,
  };
}
