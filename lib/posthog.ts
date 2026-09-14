import { PostHog } from 'posthog-node';
import { TelemetryEvent, UserContext } from './types';

// In-memory telemetry log buffer for workbench Tab 3 live stream
const telemetryBuffer: TelemetryEvent[] = [
  {
    id: 'evt-init-01',
    eventName: 'connector_invoked',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    properties: {
      connector_id: 'm365-connector-it-incidents',
      domain: 'it_incidents',
      query: 'System health check probe',
      persona_department: 'IT',
      persona_role: 'DevOpsEngineer',
      user_id: 'usr_it_582',
    },
  },
  {
    id: 'evt-init-02',
    eventName: 'acl_records_trimmed',
    timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    properties: {
      records_scanned: 5,
      records_returned: 4,
      trim_ratio: 20,
      user_id: 'usr_it_582',
      security_note: '1 record trimmed by clearance policy',
    },
  },
  {
    id: 'evt-init-03',
    eventName: 'llm_latency_recorded',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    properties: {
      model_used: 'OmniConnect Enterprise Orchestrator',
      ttft_ms: 112,
      total_tokens: 348,
      latency_ms: 284,
    },
  },
];

let serverPostHog: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!key || key.includes('phc_...')) {
    return null;
  }

  if (!serverPostHog) {
    serverPostHog = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return serverPostHog;
}

export function recordTelemetryEvent(
  eventName: TelemetryEvent['eventName'],
  properties: Record<string, any>
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    eventName,
    timestamp: new Date().toISOString(),
    properties,
  };

  // Add to in-memory buffer (kept to max 50 recent events)
  telemetryBuffer.unshift(event);
  if (telemetryBuffer.length > 50) {
    telemetryBuffer.pop();
  }

  // Attempt to emit to real PostHog if configured
  const ph = getServerPostHog();
  if (ph) {
    try {
      const distinctId = properties.user_id || 'system-orchestrator';
      ph.capture({
        distinctId,
        event: eventName,
        properties: {
          ...properties,
          $app_name: 'OmniConnect Copilot Gateway',
          $lib: 'posthog-node',
        },
      });
    } catch (err) {
      console.warn('[PostHog] Server capture failed:', err);
    }
  }

  return event;
}

export function getTelemetryStream(): TelemetryEvent[] {
  return [...telemetryBuffer];
}

// Named tracking methods required by specifications
export function trackConnectorCall(params: {
  connectorId: string;
  domain: string;
  query: string;
  user: UserContext;
}): TelemetryEvent {
  return recordTelemetryEvent('connector_invoked', {
    connector_id: params.connectorId,
    domain: params.domain,
    query: params.query,
    persona_department: params.user.department,
    persona_role: params.user.role,
    user_id: params.user.userId,
    user_name: params.user.name,
    clearance_level: params.user.clearanceLevel,
  });
}

export function trackPermissionTrimming(params: {
  recordsScanned: number;
  recordsReturned: number;
  trimRatio: number;
  user: UserContext;
  domain: string;
}): TelemetryEvent {
  return recordTelemetryEvent('acl_records_trimmed', {
    records_scanned: params.recordsScanned,
    records_returned: params.recordsReturned,
    trim_ratio: params.trimRatio,
    user_id: params.user.userId,
    persona_department: params.user.department,
    domain: params.domain,
  });
}

export function trackActionConsent(params: {
  actionType: string;
  status: 'success' | 'denied';
  latencyMs: number;
  user: UserContext;
  reason?: string;
  requiredScopes?: string[];
}): TelemetryEvent {
  if (params.status === 'denied') {
    recordTelemetryEvent('action_blocked_unauthorized', {
      action_type: params.actionType,
      user_id: params.user.userId,
      user_role: params.user.role,
      user_department: params.user.department,
      required_scopes: params.requiredScopes,
      block_reason: params.reason,
    });
  }

  return recordTelemetryEvent('agent_action_executed', {
    action_type: params.actionType,
    status: params.status,
    latency_ms: params.latencyMs,
    user_id: params.user.userId,
    user_role: params.user.role,
    reason: params.reason,
  });
}

export function trackLLMLatency(params: {
  modelUsed: string;
  ttftMs: number;
  totalTokens: number;
  latencyMs: number;
}): TelemetryEvent {
  return recordTelemetryEvent('llm_latency_recorded', {
    model_used: params.modelUsed,
    ttft_ms: params.ttftMs,
    total_tokens: params.totalTokens,
    latency_ms: params.latencyMs,
  });
}
