---
id: IT-SUM-8921
title: Incident #8921 Executive Summary: Production Database Failover
domain: it_incidents
department: IT
classification: Internal
min_clearance: L2
allowed_roles:
allowed_departments:
owner: sre-oncall@enterprise.internal
created_at: 2025-10-13
---
On October 12, the main production Postgres database in us-east-1 failed over automatically to its standby after a hardware fault at our cloud provider. The incident lasted 42 minutes from first alert to full recovery.

Customer impact: about 9 minutes of elevated error rates for search queries in North America, followed by slower responses while connections were re-established. No customer data was lost.

Follow-up: SRE is shortening connection-pool recovery time and adding a monthly failover drill. Full technical details are in the restricted post-mortem for engineering staff.
