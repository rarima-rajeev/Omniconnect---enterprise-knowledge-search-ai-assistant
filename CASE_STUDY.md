# Case Study: OmniConnect — Enterprise Knowledge Search AI Assistant & Permission Gateway

**Role**: Lead AI Product Manager & Platform Architect  
**Domain**: Enterprise Generative AI, Retrieval-Augmented Generation (RAG), Role-Based Security (RLS), Observability  
**Target Systems**: Enterprise Knowledge Repositories, Model Context Protocol (MCP), Supabase, PostHog  

---

## 1. Executive Summary

As enterprises deploy conversational AI to answer employee questions across heterogeneous internal document repositories (ERP, cloud telemetry, HR/payroll, engineering post-mortems, executive compensation), they face an existential security challenge: **enterprise data leakage** and **unauthorized action execution**.

Prompt-level guardrails (*"do not show executive salaries to junior staff"*) fail against prompt injection, jailbreaking, and attention bleed. Furthermore, autonomous action execution (e.g., rebooting a production bastion host or approving a $150,000 vendor wire) cannot safely run based on model intent alone.

**OmniConnect** was conceived and built as a production-grade **Enterprise Knowledge Search AI Assistant & Dev Workbench**. It mathematically enforces **zero enterprise data leakage down to the database tier** via session-scoped Row Level Security (RLS) data trimming, gates mutating agent actions behind automated OAuth consent verification, and provides real-time PM telemetry on data trimming ratios and tool invocations via PostHog.

---

## 2. Problem Statement & Market Context

### The Enterprise Paradox of Copilot Connectors
Enterprise IT leaders face a dilemma when connecting Copilot to internal systems:

1. **The Context Window Leakage Vulnerability**:
   - In standard RAG pipelines, semantic search retrieves top-$k$ candidate documents without session identity awareness.
   - If an unauthorized document enters the prompt context window, the model can synthesize or leak confidential figures. Prompt-based guardrails have a non-zero failure rate under jailbreaking.
2. **The Rogue Agent Action Problem**:
   - Autonomous agent tools are either read-only (idempotent retrieval) or mutating (destructive write operations).
   - Without an architectural barrier, an unauthorized user can instruct the agent to trigger high-privilege operations (e.g., rebooting cloud infrastructure or deleting customer databases).
3. **The Observability Blindspot**:
   - Product Managers and Compliance Officers lack visibility into *how much* data is being redacted per query, latency bottlenecks across connectors, and unauthorized tool call spikes.

---

## 3. Product Vision & Target Personas

### Product Vision
> *"Enable zero-trust enterprise AI adoption by ensuring Copilot can only perceive what an employee is strictly cleared to see, and execute only what an employee is pre-delegated to touch."*

### Key Personas & Jobs to Be Done (JTBD)

| Persona | Role & Clearance | Core Job to Be Done (JTBD) | Security Constraint |
|---|---|---|---|
| **Neil Wright** | Engineering Intern (L1) | Search public company directory and onboarding knowledge. | Must never access infrastructure post-mortems, payroll, or offer letters. |
| **Alex Rivera** | Staff DevOps Engineer (L3) | Triage P1/P2 cloud outages and inspect root-cause analysis (RCA) logs. | Permitted full technical logs; blocked from financial data and server reboots. |
| **Jane Doe** | Finance Director (L4) | Review executive equity ledgers and approve commercial vendor invoices. | Statutory authorization for wire transfers ($100k+); blocked from cloud reboot tools. |
| **Sarah Chen** | Enterprise Operations Admin (L4) | Calibrate global headcount models and audit EMEA candidate offer letters. | Authorized for HR/Comp benchmarks; lacks root infrastructure write access. |
| **Binny Lee** | Head of Infrastructure / Super Admin (L6) | Execute high-privilege SRE actions (rebooting bastion hosts, data purge). | Holds `Cloud.Infrastructure.Write` scope; barred from commercial wire approvals. |
| **Jay Seal** | OmniConnect Platform Admin | Monitor connector health, inspect RLS trimming deltas, and review PostHog telemetry. | Exclusive access to the `/admin` Observability Console. |

---

## 4. Product Architecture & Technical Decisions

```
[ Copilot / User Query ]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│             OmniConnect Gateway Tier                   │
│                                                        │
│  1. Intent Router ──► Maps to MCP Tool Contract        │
│  2. Action Gatekeeper ──► Checks OAuth Scopes & Role   │
│  3. Supabase RLS Engine ──► Prunes Unauthorized Rows   │
│  4. Delta Calculator ──► Computes Trimming Ratio       │
│  5. LLM Synthesizer ──► Feeds ONLY Permitted Records   │
└────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐           ┌───────────────────┐
│ PostHog Telemetry│           │ Grounded Output   │
│ (Trimming Ratio, │           │ (Authorized vs.   │
│  P95 Latency,    │           │  403 Intercept)   │
│  Action Denials) │           └───────────────────┘
└──────────────────┘
```

### Critical Architectural Decisions

#### Decision 1: Database-Tier Trimming vs. Prompt-Level Guardrails
- **Trade-off**: Filtering at the prompt level is cheaper to implement but non-deterministic. Filtering at the database level requires session-scoped identity propagation into PostgreSQL queries.
- **Decision**: Implemented session-scoped Row Level Security (RLS). Unauthorized records are pruned *before* prompt generation. If Jane queries IT outages, 4 restricted incident tickets are filtered at the SQL boundary. The LLM receives 0 leaked bytes.

#### Decision 2: Model Context Protocol (MCP) Standard for Tool Manifests
- **Decision**: Standardized all tool definitions under the Model Context Protocol (MCP v1.0).
- **Impact**: Connectors are instantly portable between Microsoft 365 Copilot, Claude Desktop, and autonomous LangChain/CrewAI agents without rewriting schemas.

#### Decision 3: Dual-Route UX Pivot (Conversational Front-End vs. Observability Deck)
- **Problem**: Early testing showed that combining deep technical telemetry (RLS diffs, JSON schemas, latency traces) on the main chat screen created cognitive overload for business users.
- **Product Pivot**: Split the application into two dedicated interfaces:
  1. **Route `/`**: A minimalist, persona-driven conversational interface for daily query execution.
  2. **Route `/admin`**: A guarded Observability Console reserved strictly for Platform Admins (Jay Seal).

---

## 5. Core Feature Highlights

### 1. Persona-Driven Gateway (`/`)
- Integrated Persona Switcher dropdown allowing instant role-play across 6 enterprise identities.
- Dynamic Action Button: When `Jay Seal` is selected, an exclusive navigation badge appears: `"Open Admin Observability Deck ->"`.

### 2. Popular Scenario Evaluation Matrix
A suite of 7 interactive test scenarios demonstrating exact role boundaries:
1. `[Agent Action - SRE]`: Bastion reboot (Allowed: Binny Lee L6 • Denied: All others with `403 Consent Required`).
2. `[Agent Action - Finance]`: $150k wire transfer (Allowed: Jane Doe • Denied: Non-Finance officers).
3. `[Agent Action - Data Governance]`: Production CRM record purge (Allowed: Binny Lee L6 • Blocked: All others).
4. `[Knowledge Retrieval - Confidential]`: CEO & VP Eng stock vesting (Allowed: Jane Doe & Sarah Chen • Trimmed for others).
5. `[Knowledge Retrieval - HR/Comp]`: London candidate offer letters (Allowed: Sarah Chen • Denied for others).
6. `[Knowledge Retrieval - Public]`: "Who is the CEO?" (Allowed for all personas including Intern Neil).
7. `[Knowledge Retrieval - Technical]`: Postgres RDS failover RCA (Full logs for Alex; Executive summary for management; Restricted for Intern).

### 3. State-Aware Response Viewport
- **Access Granted**: Displays green `Authorized & Grounded` badge, record citations, and user context.
- **Access Blocked**: Displays high-visibility amber/red `403 Consent Required`, `403 Forbidden`, or `Policy Boundary Enforced` card with plain-English explanation of why access was withheld.
- **Micro-Audit Drawer**: 1-click expandable pipeline trace showing millisecond stage latencies.

### 4. Admin Observability Deck (`/admin`)
- Guarded route returning `403 Forbidden` if visited by non-admin personas.
- Visual **RLS Diff Inspector** comparing raw candidate records vs. permitted context.
- Live **PostHog Telemetry Stream** logging event payloads, latencies, and ACL enforcement outcomes in real time.

---

## 6. Telemetry & Success Metrics (PostHog Integration)

As an AI Product Manager, key metrics were instrumented server-side via `posthog-node` and client-side via `posthog-js`:

```
┌───────────────────────────────────────────────────────────────┐
│                    Key Product Health Metrics                 │
├─────────────────────────┬───────────────────────┬─────────────┤
│ Metric Name             │ Telemetry Event       │ Target SLA  │
├─────────────────────────┼───────────────────────┼─────────────┤
│ ACL Trimming Delta      │ acl_records_trimmed   │ 100% Redact │
│ Data Leakage Rate       │ security_intercept    │ 0.00% Leak  │
│ P95 Gateway Latency     │ llm_latency_recorded  │ < 800ms     │
│ Unauthorized Intercepts │ action_blocked_unauth │ Real-Time   │
│ Mean Gateway Latency    │ gateway_execution_ms  │ ~210ms Obs. │
└─────────────────────────┴───────────────────────┴─────────────┘
```

---

## 7. Results, Key Learnings & Future Roadmap

### Measurable Results
- **100% Enforcement of Zero-Trust Security**: Validated across all 7 scenarios with 0 leaked records.
- **Sub-300ms Gateway Overhead**: Full intent recognition, RLS evaluation, delta calculation, and synthesis completed in ~210ms (well within the 800ms enterprise SLA).
- **Production-Grade Resiliency**: Built with zero-crash simulated fallbacks, enabling interactive stakeholder demos without hard dependencies on live cloud credentials.

### Key PM Learnings
1. **Security Must Be Architectural, Not Conversational**: Treating security as a prompting challenge creates fragile products. Embedding security into database query parameters makes compliance deterministic and auditable.
2. **Action Tools Require Asymmetric Gatekeeping**: Read operations can be gracefully trimmed; write operations must fail-closed with structured remediation steps (`403 Consent Required`).
3. **Decoupling User Experience from Governance**: Power users and business users require completely different visual density. Isolating the Observability Console to `/admin` boosted UX clarity without sacrificing compliance depth.

### Future Roadmap
- **M365 Copilot Studio Direct Integration**: Exporting MCP schemas directly as Microsoft Graph Connectors.
- **Dual-Key Multi-Party Approval (MPA)**: Requiring two directors to consent before wire transfers > $500,000 can execute.
- **Differential Privacy Aggregation Guards**: Automatically blocking statistical queries when candidate cohorts are too small ($n < 5$).
