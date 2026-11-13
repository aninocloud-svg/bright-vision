# BVTCS security release checklist

This branch stages a BVTCS-only security implementation. It does not publish the site, deploy Edge Functions, or apply the database migration.

## Scope and isolation

- Target table: `public.bv_customer_enquiries` only.
- New BVTCS-only database objects: `bv_submission_rate_limits`, `bv_admin_audit_log`, and `bv_allow_submission(text)`.
- New Edge Functions: `submit-bv-enquiry` and `export-bv-enquiries`.
- Existing `kr_*` objects, users, functions, and tables are out of scope and must not be changed.
- Browser configuration contains only the Supabase publishable/anon key. Never put the service-role key in GitHub or browser code.

## Release order (operator approval required)

1. Confirm the Supabase project is the intended BVTCS environment and take a database backup.
2. Review and apply `supabase/migrations/202611130001_bvtcs_security_hardening.sql`.
   - It revokes broad browser-role grants on `bv_customer_enquiries`, keeps authenticated SELECT/UPDATE for the existing BVTCS admin RLS policies, and removes public direct INSERT.
   - It creates private rate-limit and export-audit tables and a service-role-only rate-limit RPC.
   - Verify the existing admin SELECT and UPDATE policies still match the intended administrator identity.
3. Configure the Supabase Edge Function secrets using the project dashboard/CLI. Supabase normally injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; verify they exist and do not expose the latter.
4. Deploy `submit-bv-enquiry` with JWT verification disabled **only** because it is a public form endpoint. The function implements strict field validation, origin allowlisting, a honeypot, body-size checks, and server-side rate limiting. CORS is not an authentication control.
5. Deploy `export-bv-enquiries` with JWT verification enabled. It additionally verifies the access token, exact admin email, and `aal2` MFA assurance before reading/exporting customer records.
6. In Supabase Auth, create/invite the intended admin user at `info@bvtcs.com.qa`, require MFA, and confirm recovery procedures. Do not reuse a password embedded in website source or chat.
7. Test submissions and admin export with synthetic records only. Confirm unauthenticated users cannot select/update/delete enquiries; authenticated non-admin users cannot read/update; the admin must complete MFA; exports are private and logged.
8. Review the branch and approve merging to `main` only after all tests pass. GitHub Pages will publish from `main` only if configured that way.

## Data and export controls

The workbook contains Qatar-local date/time, customer name, phone, optional email, selected service, inquiry text, and status. Formula-like values are neutralized to reduce spreadsheet formula injection. Exports are generated in memory and returned directly to the authenticated administrator; no public storage URL is created. The dashboard shows the latest 500 enquiries; the workbook export currently includes up to 10,000.

## Platform limitations / remaining production controls

GitHub Pages is static hosting and cannot enforce HTTP response headers or run a private server-side login itself. Sensitive operations therefore run in Supabase Edge Functions. Before production, configure suitable security response headers at the CDN/custom-domain proxy if available, enable Supabase leaked-password protection, review auth rate limits and SMTP, and confirm backup/retention and Qatar privacy-law requirements. The current GitHub Pages static host cannot provide a guaranteed CSP/HSTS header by itself.

## Rollback

If a release test fails, disable the two new Edge Functions first. Restore the database from the pre-release backup if necessary. Do not drop or alter unrelated project objects. The SQL migration is additive apart from revoking excess grants and dropping the legacy public insert policy; restore that policy/grants only as a deliberate, reviewed rollback decision, not as a default.
