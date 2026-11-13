-- BVTCS-only hardening migration. Apply only after reviewing the security branch.
-- Does not alter any other application's tables, policies, functions, or users.

ALTER TABLE public.bv_customer_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit enquiries" ON public.bv_customer_enquiries;

REVOKE ALL ON TABLE public.bv_customer_enquiries FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.bv_customer_enquiries TO authenticated;

-- Keep the existing BVTCS admin SELECT/UPDATE policies in place.
-- No DELETE permission is granted to browser roles.

CREATE TABLE IF NOT EXISTS public.bv_submission_rate_limits (
  ip_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  submission_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.bv_submission_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bv_submission_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bv_allow_submission(p_ip_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.bv_submission_rate_limits(ip_hash, window_started_at, submission_count)
  VALUES (p_ip_hash, now(), 1)
  ON CONFLICT (ip_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN public.bv_submission_rate_limits.window_started_at < now() - interval '15 minutes' THEN now()
          ELSE public.bv_submission_rate_limits.window_started_at END,
        submission_count = CASE
          WHEN public.bv_submission_rate_limits.window_started_at < now() - interval '15 minutes' THEN 1
          ELSE public.bv_submission_rate_limits.submission_count + 1 END
  RETURNING submission_count INTO v_count;
  RETURN v_count <= 5;
END;
$$;
REVOKE ALL ON FUNCTION public.bv_allow_submission(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bv_allow_submission(text) TO service_role;

CREATE TABLE IF NOT EXISTS public.bv_admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid,
  action text NOT NULL CHECK (action IN ('export_enquiries')),
  record_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.bv_admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bv_admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.bv_admin_audit_log TO service_role;

-- Remove stale rate-limit fingerprints after 30 days; schedule this with Supabase Cron after release.
