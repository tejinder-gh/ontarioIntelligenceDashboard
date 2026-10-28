-- ============================================================================
-- Ontario Intelligence — National Business Data & Venture Automation Platform
-- Migration: 20261028_business_intelligence_os.sql
-- Description: Additive foundation for canonical entities, raw source records,
--              multi-channel contacts, deduplication matches, verification events,
--              durable PostgreSQL job queue, venture modules, and CASL outreach.
-- ============================================================================

BEGIN;

-- 1. Business Entities (Parent corporate/holding entities)
CREATE TABLE IF NOT EXISTS business_entities (
    id VARCHAR(64) PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(64) NOT NULL DEFAULT 'CA',
    registration_number VARCHAR(128),
    entity_type VARCHAR(64) NOT NULL DEFAULT 'CORPORATION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_entities_legal_name ON business_entities(legal_name);
CREATE INDEX IF NOT EXISTS idx_business_entities_reg_no ON business_entities(registration_number);

-- 2. Additive columns on existing businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS entity_id VARCHAR(64) REFERENCES business_entities(id) ON DELETE SET NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS source_observed_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_basis TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS operating_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(64);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website VARCHAR(512);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2) NOT NULL DEFAULT 0.00;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.00;

-- Ensure last_confirmed_at does not default to NOW() for new insertions
ALTER TABLE businesses ALTER COLUMN last_confirmed_at DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_businesses_verification ON businesses(verification_status);
CREATE INDEX IF NOT EXISTS idx_businesses_operating_status ON businesses(operating_status);
CREATE INDEX IF NOT EXISTS idx_businesses_quality_score ON businesses(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_source_observed ON businesses(source_observed_at DESC);

-- 3. Business Source Records (Append-only raw source observations)
CREATE TABLE IF NOT EXISTS business_source_records (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    source_record_id VARCHAR(255) NOT NULL,
    canonical_business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE SET NULL,
    raw_payload JSONB NOT NULL,
    payload_checksum VARCHAR(64) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingestion_run_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_biz_src_canonical ON business_source_records(canonical_business_id);
CREATE INDEX IF NOT EXISTS idx_biz_src_lookup ON business_source_records(source_id, source_record_id);

-- 4. Business Aliases (Trading names and historical renames)
CREATE TABLE IF NOT EXISTS business_aliases (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    alias_type VARCHAR(64) NOT NULL DEFAULT 'TRADING_NAME',
    source_id VARCHAR(64) REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_aliases_name ON business_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_business_aliases_biz ON business_aliases(business_id);

-- 5. Business Contacts & CASL Compliance Points
CREATE TABLE IF NOT EXISTS business_contacts (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel_type VARCHAR(32) NOT NULL,
    channel_value VARCHAR(255) NOT NULL,
    contact_role VARCHAR(64),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    casl_consent_type VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
    casl_evidence_ref TEXT,
    casl_obtained_at TIMESTAMPTZ,
    casl_expires_at TIMESTAMPTZ,
    is_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, channel_type, channel_value)
);

CREATE INDEX IF NOT EXISTS idx_business_contacts_channel ON business_contacts(channel_type, channel_value);
CREATE INDEX IF NOT EXISTS idx_business_contacts_casl ON business_contacts(casl_consent_type);

-- 6. Business Identity Matches (Candidate deduplication & merge ledger)
CREATE TABLE IF NOT EXISTS business_identity_matches (
    id VARCHAR(64) PRIMARY KEY,
    business_id_a VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    business_id_b VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5,2) NOT NULL,
    match_method VARCHAR(64) NOT NULL,
    match_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW',
    resolved_by VARCHAR(64),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_matches_status ON business_identity_matches(resolution_status);
CREATE INDEX IF NOT EXISTS idx_identity_matches_pairs ON business_identity_matches(business_id_a, business_id_b);

-- 7. Business Verification Events (Independent operational audit trail)
CREATE TABLE IF NOT EXISTS business_verification_events (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    verification_method VARCHAR(64) NOT NULL,
    observed_operating_status VARCHAR(32) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_AGENT'
);

CREATE INDEX IF NOT EXISTS idx_biz_verif_events ON business_verification_events(business_id, verified_at DESC);

-- 8. Durable PostgreSQL Job Queue & Outbox
CREATE TABLE IF NOT EXISTS durable_jobs (
    id VARCHAR(64) PRIMARY KEY,
    queue_name VARCHAR(64) NOT NULL,
    job_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(128) UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    lease_owner VARCHAR(64),
    lease_expires_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    backoff_base_sec INTEGER NOT NULL DEFAULT 10,
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_durable_jobs_lease ON durable_jobs(queue_name, status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_durable_jobs_idemp ON durable_jobs(idempotency_key);

-- 9. Venture Modules
CREATE TABLE IF NOT EXISTS venture_modules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_workflows JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Venture Targets (Pipeline & Qualification)
CREATE TABLE IF NOT EXISTS venture_targets (
    id VARCHAR(64) PRIMARY KEY,
    venture_id VARCHAR(64) NOT NULL REFERENCES venture_modules(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    qualification_status VARCHAR(32) NOT NULL DEFAULT 'QUALIFIED',
    qualification_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    qualification_hypotheses JSONB NOT NULL DEFAULT '[]'::jsonb,
    opportunity_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    enriched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venture_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_venture_targets_status ON venture_targets(venture_id, qualification_status);
CREATE INDEX IF NOT EXISTS idx_venture_targets_score ON venture_targets(venture_id, qualification_score DESC);

-- 11. Outreach Campaigns
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id VARCHAR(64) PRIMARY KEY,
    venture_id VARCHAR(64) NOT NULL REFERENCES venture_modules(id),
    name VARCHAR(255) NOT NULL,
    execution_mode VARCHAR(32) NOT NULL DEFAULT 'DRY_RUN',
    authorized_channels JSONB NOT NULL DEFAULT '["EMAIL"]'::jsonb,
    target_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    daily_send_cap INTEGER NOT NULL DEFAULT 50,
    budget_cap_cad NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sender_identity VARCHAR(255),
    compliance_basis VARCHAR(64) NOT NULL DEFAULT 'CASL_B2B_RELEVANT',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(64),
    approved_at TIMESTAMPTZ,
    kill_switch_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_venture ON outreach_campaigns(venture_id, execution_mode);

-- 12. Outreach Messages & Action Ledger
CREATE TABLE IF NOT EXISTS outreach_messages (
    id VARCHAR(64) PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id),
    contact_id VARCHAR(64) REFERENCES business_contacts(id),
    channel VARCHAR(32) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body_text TEXT NOT NULL,
    is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    dispatch_status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    provider_message_id VARCHAR(128),
    response_intent VARCHAR(64),
    casl_exemption_record JSONB NOT NULL DEFAULT '{}'::jsonb,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_campaign_status ON outreach_messages(campaign_id, dispatch_status);
CREATE INDEX IF NOT EXISTS idx_outreach_recipient ON outreach_messages(recipient_address);

-- 13. Outreach Suppression Registry
CREATE TABLE IF NOT EXISTS outreach_suppression (
    id VARCHAR(64) PRIMARY KEY,
    channel_type VARCHAR(32) NOT NULL,
    channel_value VARCHAR(255) NOT NULL,
    scope VARCHAR(32) NOT NULL DEFAULT 'GLOBAL',
    campaign_id VARCHAR(64) REFERENCES outreach_campaigns(id),
    reason VARCHAR(64) NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (channel_type, channel_value, scope)
);

CREATE INDEX IF NOT EXISTS idx_suppression_lookup ON outreach_suppression(channel_type, channel_value);

-- 14. Acuity Voice Jobs Gateway Contract
CREATE TABLE IF NOT EXISTS acuity_voice_jobs (
    id VARCHAR(64) PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL REFERENCES outreach_campaigns(id),
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id),
    target_phone VARCHAR(64) NOT NULL,
    lead_name VARCHAR(128),
    business_name VARCHAR(255) NOT NULL,
    persona VARCHAR(64) NOT NULL DEFAULT 'COMMERCIAL_RESEARCHER',
    status VARCHAR(32) NOT NULL DEFAULT 'STAGED',
    disposition VARCHAR(64),
    recording_ref VARCHAR(255),
    transcript_summary TEXT,
    regulatory_clearance JSONB NOT NULL DEFAULT '{"dncl_checked": false, "time_window_valid": true, "ai_disclosure_active": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acuity_jobs_status ON acuity_voice_jobs(status);
CREATE INDEX IF NOT EXISTS idx_acuity_jobs_campaign ON acuity_voice_jobs(campaign_id);

COMMIT;
