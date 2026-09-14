export type Department = 'Finance' | 'IT' | 'Operations' | 'Infrastructure' | 'General' | 'System';
export type UserRole =
  | 'FinanceDirector'
  | 'DevOpsEngineer'
  | 'EnterpriseAdmin'
  | 'SuperAdmin'
  | 'Intern'
  | 'SystemAdmin';
export type ClearanceLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  department: Department;
  role: UserRole;
  clearanceLevel: ClearanceLevel;
  scopes: string[];
}

export interface EnterprisePersona {
  id: string;
  name: string;
  title: string;
  department: Department;
  role: UserRole;
  clearanceLevel: ClearanceLevel;
  levelDisplay: string;
  scopes: string[];
  avatar: string;
  description: string;
  isSystemAdmin?: boolean;
}

export interface MCPProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface MCPToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, MCPProperty>;
    required: string[];
  };
}

export interface ConnectorManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'semantic_retrieval' | 'agent_action';
  status: 'active' | 'gated' | 'maintenance';
  endpoint: string;
  requiredScopes: string[];
  tool: MCPToolDeclaration;
}

export interface EnterpriseRecord {
  id: string;
  domain: string;
  department: Department;
  minClearance: ClearanceLevel;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  data: Record<string, any>;
  metadata: {
    created_at: string;
    owner: string;
    acl_tag: string;
  };
}

export interface TelemetryEvent {
  id: string;
  eventName:
    | 'connector_invoked'
    | 'acl_records_trimmed'
    | 'agent_action_executed'
    | 'llm_latency_recorded'
    | 'action_blocked_unauthorized';
  timestamp: string;
  properties: {
    connector_id?: string;
    domain?: string;
    query?: string;
    persona_department?: string;
    persona_role?: string;
    user_id?: string;
    records_scanned?: number;
    records_returned?: number;
    trim_ratio?: number;
    action_type?: string;
    status?: 'success' | 'denied';
    latency_ms?: number;
    model_used?: string;
    ttft_ms?: number;
    total_tokens?: number;
    required_scopes?: string[];
    [key: string]: any;
  };
}

export interface OrchestrationStep {
  step: number;
  name: string;
  description: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'blocked';
  durationMs: number;
  metadata?: Record<string, any>;
}

export interface ConsentRequiredError {
  code: string;
  message: string;
  requiredRole: UserRole[];
  requiredScopes: string[];
  currentRole: UserRole;
  currentScopes: string[];
  resolutionSteps: string[];
}

export interface DecisionMeta {
  type: 'ALLOWED' | 'BLOCKED';
  badge: string;
  headline: string;
  reason: string;
  policyRule: string;
  authorizedRoles: string[];
}

export interface OrchestrationResult {
  success: boolean;
  query: string;
  persona: UserContext;
  intent: string;
  connectorId: string;
  recordsScanned: number;
  recordsPermitted: number;
  trimRatio: number;
  securityInterceptNote?: string;
  scannedRecords: EnterpriseRecord[];
  permittedRecords: EnterpriseRecord[];
  trimmedRecords: EnterpriseRecord[];
  groundedResponse: string;
  actionExecuted?: boolean;
  actionPayload?: any;
  actionResult?: any;
  consentRequired?: ConsentRequiredError;
  decision?: DecisionMeta;
  executionSteps: OrchestrationStep[];
  telemetry: TelemetryEvent[];
  latencyMs: number;
  modelUsed: string;
  tokenStats: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
