---
id: IT-SUM-8877
title: Incident #8877 Executive Summary: Session Cache Outage
domain: it_incidents
department: IT
classification: Internal
min_clearance: L2
allowed_roles:
allowed_departments:
owner: sre-oncall@enterprise.internal
created_at: 2025-09-03
---
On September 2, the Redis cluster that stores user sessions in eu-west-1 failed over twice within an hour. European customers were signed out of the web console and had to log in again. The incident lasted 27 minutes.

No data was lost, because sessions are designed to be disposable. The cause was a misconfigured memory limit after a routine upgrade. SRE has added a configuration check to the upgrade checklist.
