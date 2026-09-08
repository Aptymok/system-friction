# SFI Release Cost Boundary

Canonical release discipline for the FULL REMAKE.

Routine implementation and assurance run in GitHub CI. Automatic Vercel Git deployments are disabled. Vercel is a release/production-observation plane, not an ordinary PR preview or typecheck plane.

A production deployment is justified only when an exact canonical HEAD has passed required assurance and production observation is necessary for RETURN. The existing prebuilt production workflow remains the release owner and is intentionally decoupled from ordinary implementation merges.

This document does not alter runtime authority, application behavior, data policy or external publication authority.
