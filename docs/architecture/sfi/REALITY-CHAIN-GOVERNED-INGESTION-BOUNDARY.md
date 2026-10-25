# Governed Reality Chain integration

The historical collector produces unadmitted RECORD candidates. The existing Case Platform endpoint `/api/external/v1/cases` supports `operation=add_object`, but only with user-bound OAuth credentials carrying `cases:write` and active case tenant membership.

An unattended GitHub cron MUST NOT impersonate a user, use service-role database credentials, or bypass `assertTenantAccess`. Accordingly, the scheduled snapshot uploads an artifact only. It does not mutate Case Platform.

To implement an unattended write path, add an explicit tenant-scoped delegated service principal with revocable grants, audit trail, rate limits, allowed case IDs and only RECORD/SOURCE_METADATA_ONLY operations. Review database RLS and authorization contract before activation. Evidence admission, governance, RETURN and TRUTH remain gated. Do not store user OAuth refresh tokens in GitHub Actions.

Verification: the existing snapshot workflow and SFI Verify have both succeeded on PR #831. End-to-end authorized ingestion is NOT verified or enabled.
