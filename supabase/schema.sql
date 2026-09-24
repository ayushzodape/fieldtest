-- FieldTest — Database Schema & Security Policies
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Enable pgcrypto if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Operators Table
CREATE TABLE IF NOT EXISTS public.operators (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    agency TEXT NOT NULL DEFAULT 'Department of Law Enforcement',
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'supervisor', 'auditor', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Field Tests Table (The Core Evidence Log)
CREATE TABLE IF NOT EXISTS public.field_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id TEXT UNIQUE NOT NULL, -- e.g. "FT-2026-000184"
    operator_id TEXT NOT NULL,      -- references operators.badge_number
    captured_at TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    test_type TEXT NOT NULL DEFAULT 'marquis',
    result TEXT NOT NULL CHECK (result IN ('PRESUMPTIVE_POSITIVE', 'PRESUMPTIVE_NEGATIVE', 'INCONCLUSIVE', 'INVALID_CAPTURE')),
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    classifier_version TEXT NOT NULL DEFAULT 'color-v1.0',
    schema_version TEXT NOT NULL DEFAULT '1.0',
    image_sha256 TEXT NOT NULL,
    record_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    canonical_record JSONB NOT NULL,
    explanation JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_field_tests_record_id ON public.field_tests(record_id);
CREATE INDEX IF NOT EXISTS idx_field_tests_operator_id ON public.field_tests(operator_id);
CREATE INDEX IF NOT EXISTS idx_field_tests_captured_at ON public.field_tests(captured_at DESC);

-- 4. Test Images Table
CREATE TABLE IF NOT EXISTS public.test_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.field_tests(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    image_sha256 TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_images_test_id ON public.test_images(test_id);

-- 5. Audit Events Table (Immutable Chain of Custody)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('RECORD_CREATED', 'RECORD_SEALED', 'RECORD_VERIFIED', 'TAMPER_DETECTED', 'RECORD_EXPORTED')),
    operator_id TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_record_id ON public.audit_events(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON public.audit_events(timestamp DESC);

-- 6. Row Level Security (RLS)
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Operator policies
CREATE POLICY "Operators are viewable by authenticated users"
    ON public.operators FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Operators can update their own profile"
    ON public.operators FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Field Tests policies
-- Anyone (authenticated or public) can SELECT a record for public verification
CREATE POLICY "Field tests are viewable for verification"
    ON public.field_tests FOR SELECT
    TO anon, authenticated
    USING (true);

-- Anyone (authenticated operators or demo client) can insert a test
CREATE POLICY "Operators can insert field tests"
    ON public.field_tests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Immutable records: No one may UPDATE or DELETE existing field test records
-- (Preserves tamper-evidence and chain of custody)
CREATE POLICY "Field tests are immutable (no updates)"
    ON public.field_tests FOR UPDATE
    TO authenticated, anon
    USING (false);

CREATE POLICY "Field tests are immutable (no deletes)"
    ON public.field_tests FOR DELETE
    TO authenticated, anon
    USING (false);

-- Audit Events policies (Append-only)
CREATE POLICY "Audit events viewable by authenticated and anon"
    ON public.audit_events FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Audit events can be inserted"
    ON public.audit_events FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Audit events cannot be modified"
    ON public.audit_events FOR UPDATE
    TO authenticated, anon
    USING (false);

CREATE POLICY "Audit events cannot be deleted"
    ON public.audit_events FOR DELETE
    TO authenticated, anon
    USING (false);

-- 7. Storage Bucket Setup (test-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-images', 'test-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Public read, authenticated upload
CREATE POLICY "Test images are publicly accessible"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'test-images');

CREATE POLICY "Authenticated users can upload test images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'test-images');
