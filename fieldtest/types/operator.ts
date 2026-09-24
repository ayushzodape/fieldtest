/**
 * Operator type definitions
 */

export interface Operator {
  id: string;
  authUserId: string;
  operatorCode: string;    // e.g., "OP-042"
  displayName: string;
  role: OperatorRole;
  createdAt: string;       // ISO 8601
}

export type OperatorRole = 'operator' | 'supervisor' | 'admin';
