import { ConnectorManifest } from './types';

export const MCP_CONNECTORS: ConnectorManifest[] = [
  {
    id: 'm365-connector-it-incidents',
    name: 'Azure & AWS Cloud Infrastructure Incidents Connector',
    description: 'Semantic retrieval connector for enterprise cloud infrastructure outages, Kubernetes cluster degradation, and database failover alerts.',
    version: '2.4.0',
    category: 'semantic_retrieval',
    status: 'active',
    endpoint: '/api/copilot?connector=it-incidents',
    requiredScopes: ['read.infrastructure.incidents'],
    tool: {
      name: 'query_it_incidents',
      description: 'Search enterprise telemetry, P1/P2 outage tickets, and post-mortem incident logs with strict ACL filtering.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Freeform semantic search query regarding outages, cluster health, or network latency.',
          },
          severity: {
            type: 'string',
            description: 'Incident severity level filter',
            enum: ['ALL', 'P1 - Critical', 'P2 - High', 'P3 - Moderate'],
          },
          service: {
            type: 'string',
            description: 'Target cloud service identifier (e.g. Postgres-RDS, Kubernetes-Core, Kafka-Cluster).',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    id: 'm365-connector-executive-payroll',
    name: 'Workday & Carta Executive Payroll & Equity Connector',
    description: 'Confidential retrieval connector for executive compensation packages, Q3/Q4 RSU grants, retention bonus pools, and salary band calibration.',
    version: '1.9.1',
    category: 'semantic_retrieval',
    status: 'active',
    endpoint: '/api/copilot?connector=executive-payroll',
    requiredScopes: ['read.finance.payroll.restricted'],
    tool: {
      name: 'query_executive_payroll',
      description: 'Retrieve executive equity grants, vesting milestones, and departmental bonus pools. Enforces Finance department ACL clearance.',
      parameters: {
        type: 'object',
        properties: {
          quarter: {
            type: 'string',
            description: 'Fiscal quarter (e.g., Q1, Q2, Q3, Q4).',
            enum: ['Q1', 'Q2', 'Q3', 'Q4'],
          },
          fiscalYear: {
            type: 'string',
            description: 'Four digit fiscal year (e.g., 2024, 2025).',
          },
          employeeBand: {
            type: 'string',
            description: 'Target seniority band filter.',
            enum: ['ALL', 'C-Suite', 'VP-Level', 'Director-Level'],
          },
        },
        required: ['quarter'],
      },
    },
  },
  {
    id: 'm365-connector-bastion-ops',
    name: 'Cloud Bastion & SRE Operational Control Gateway',
    description: 'Autonomous agent action gateway executing high-privilege infrastructure mutation and host power-cycle operations.',
    version: '3.1.0',
    category: 'agent_action',
    status: 'gated',
    endpoint: '/api/copilot?action=restart_service',
    requiredScopes: ['admin.infrastructure.write', 'admin.bastion.reboot'],
    tool: {
      name: 'restart_service',
      description: 'Gracefully drain active client connections and cycle the target infrastructure node or bastion host. Requires EnterpriseAdmin consent.',
      parameters: {
        type: 'object',
        properties: {
          service_name: {
            type: 'string',
            description: 'Fully qualified service or host name (e.g. prod-bastion-us-east-1, k8s-ingress-gateway).',
          },
          region: {
            type: 'string',
            description: 'Cloud deployment region (e.g. us-east-1, eu-central-1).',
          },
          reason: {
            type: 'string',
            description: 'Incident ticket ID and operational justification for restarting production assets.',
          },
        },
        required: ['service_name', 'region', 'reason'],
      },
    },
  },
];
