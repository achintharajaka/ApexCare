-- ==========================================================
-- ApexCare Hospital Management System (HMS)
-- Row-Level Security (RLS) SQL Migration
-- ==========================================================

-- Enable Row Level Security on Core Tables
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS patient_tenant_isolation_policy ON "Patient";
DROP POLICY IF EXISTS medical_record_tenant_isolation_policy ON "MedicalRecord";
DROP POLICY IF EXISTS bill_tenant_isolation_policy ON "Bill";
DROP POLICY IF EXISTS audit_log_tenant_isolation_policy ON "AuditLog";

-- Create Tenant Application Context Policies
CREATE POLICY patient_tenant_isolation_policy ON "Patient"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY medical_record_tenant_isolation_policy ON "MedicalRecord"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY bill_tenant_isolation_policy ON "Bill"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY audit_log_tenant_isolation_policy ON "AuditLog"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Principle of Least Privilege: Restrict App DB User
DO $$
BEGIN
   IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hms_app_user') THEN
      REVOKE ALL ON SCHEMA public FROM hms_app_user;
      GRANT CONNECT ON DATABASE hms_production TO hms_app_user;
      GRANT USAGE ON SCHEMA public TO hms_app_user;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hms_app_user;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hms_app_user;
      -- Explicitly forbid DDL permissions
      REVOKE CREATE, DROP, ALTER ON SCHEMA public FROM hms_app_user;
   END IF;
END
$$;
