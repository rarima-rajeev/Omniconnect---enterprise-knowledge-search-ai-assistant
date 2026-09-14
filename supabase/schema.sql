-- ====================================================================
-- OmniConnect: Microsoft 365 Copilot Connector Gateway Database Schema
-- Production PostgreSQL Schema with Row Level Security (RLS)
-- ====================================================================

-- 1. Create custom enum types
CREATE TYPE enterprise_department AS ENUM ('Finance', 'IT', 'Operations');
CREATE TYPE clearance_level AS ENUM ('L1', 'L2', 'L3', 'L4');
CREATE TYPE classification_tier AS ENUM ('Public', 'Internal', 'Confidential', 'Restricted');

-- 2. Cloud Infrastructure Incidents Table
CREATE TABLE IF NOT EXISTS it_incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    service TEXT NOT NULL,
    region TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    duration TEXT NOT NULL,
    summary TEXT NOT NULL,
    impact TEXT NOT NULL,
    resolution TEXT NOT NULL,
    department enterprise_department NOT NULL DEFAULT 'IT',
    min_clearance clearance_level NOT NULL DEFAULT 'L3',
    classification classification_tier NOT NULL DEFAULT 'Restricted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    owner TEXT NOT NULL
);

-- 3. Executive Payroll & Equity Table
CREATE TABLE IF NOT EXISTS executive_payroll (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    quarter TEXT NOT NULL,
    fiscal_year TEXT NOT NULL,
    employee_band TEXT NOT NULL,
    recipient TEXT NOT NULL,
    rsu_grant_value TEXT NOT NULL,
    bonus_pool_allocation TEXT NOT NULL,
    vesting_schedule TEXT NOT NULL,
    tax_withholding_status TEXT NOT NULL,
    department enterprise_department NOT NULL DEFAULT 'Finance',
    min_clearance clearance_level NOT NULL DEFAULT 'L2',
    classification classification_tier NOT NULL DEFAULT 'Restricted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    owner TEXT NOT NULL
);

-- 4. Enable Row Level Security on both tables
ALTER TABLE it_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_payroll ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. RLS POLICIES FOR IT INCIDENTS
-- ====================================================================

-- Public / L1 records are visible to any authenticated enterprise user
CREATE POLICY "Public IT notices accessible to all"
ON it_incidents
FOR SELECT
TO authenticated
USING (
    classification = 'Public' OR min_clearance = 'L1'
);

-- IT department staff with appropriate clearance
CREATE POLICY "IT Department staff incident clearance"
ON it_incidents
FOR SELECT
TO authenticated
USING (
    current_setting('app.current_department', true) = 'IT'
    AND (
        (min_clearance = 'L2' AND current_setting('app.current_clearance', true) IN ('L2', 'L3', 'L4'))
        OR
        (min_clearance = 'L3' AND current_setting('app.current_clearance', true) IN ('L3', 'L4'))
    )
);

-- EnterpriseAdmin has global override access
CREATE POLICY "EnterpriseAdmin global override for IT incidents"
ON it_incidents
FOR SELECT
TO authenticated
USING (
    current_setting('app.current_role', true) = 'EnterpriseAdmin'
    OR current_setting('app.current_clearance', true) = 'L4'
);

-- ====================================================================
-- 6. RLS POLICIES FOR EXECUTIVE PAYROLL
-- ====================================================================

-- Public benefits documents visible to all employees
CREATE POLICY "Public employee benefit documents accessible to all"
ON executive_payroll
FOR SELECT
TO authenticated
USING (
    classification = 'Public' OR min_clearance = 'L1'
);

-- Finance department staff with L2+ clearance
CREATE POLICY "Finance staff compensation clearance"
ON executive_payroll
FOR SELECT
TO authenticated
USING (
    current_setting('app.current_department', true) = 'Finance'
    AND current_setting('app.current_clearance', true) IN ('L2', 'L3', 'L4')
);

-- EnterpriseAdmin global clearance override
CREATE POLICY "EnterpriseAdmin global override for Payroll"
ON executive_payroll
FOR SELECT
TO authenticated
USING (
    current_setting('app.current_role', true) = 'EnterpriseAdmin'
    OR current_setting('app.current_clearance', true) = 'L4'
);
