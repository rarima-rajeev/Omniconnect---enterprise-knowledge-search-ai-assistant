import { ClearanceLevel, Department, UserContext, UserRole } from './types';

export type Classification = 'Public' | 'Internal' | 'Confidential' | 'Restricted';

// Access tags carried by every document, and inherited by each of its chunks.
export interface AccessTags {
  classification: Classification;
  minClearance: ClearanceLevel;
  allowedRoles: UserRole[]; // empty = any role that meets the clearance
  allowedDepartments: Department[]; // empty = any department
}

export function clearanceRank(level: ClearanceLevel): number {
  return Number(level.slice(1));
}

// TypeScript mirror of can_read() in supabase/schema.sql.
// The database function is the enforcement point; this copy is the independent
// oracle the evals use to check that the database never returns a chunk it shouldn't.
export function canRead(user: UserContext, doc: AccessTags): boolean {
  if (user.role === 'SystemAdmin') return true;
  if (clearanceRank(user.clearanceLevel) < clearanceRank(doc.minClearance)) return false;
  if (doc.allowedRoles.length > 0 && !doc.allowedRoles.includes(user.role)) return false;
  if (doc.allowedDepartments.length > 0 && !doc.allowedDepartments.includes(user.department)) return false;
  return true;
}
