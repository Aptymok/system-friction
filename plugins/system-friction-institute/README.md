# SYSTEM FRICTION INSTITUTE plugin

Public source package for the SFI plugin marketplace entry.

## MCP servers

- `https://www.systemfriction.org/api/mcp/authenticated`
- `https://www.systemfriction.org/api/mcp/studio`

Authentication is user-bound OAuth. Effective scopes remain the intersection of the OAuth client ceiling and the authenticated SFI principal's assigned authority.

Version 1.0.2 exposes the current authenticated gateway contract, including the bounded founder-only `root:operate` surface for authorized ROOT principals. This supports ROOT report retrieval plus institutional account listing/invitation without opening arbitrary ROOT routes.

The package itself does not grant ROOT authority. `root:operate` and `governance:decide` remain separately controlled by live SFI identity, OAuth scope, tenant, and server-side authority checks. Non-ROOT operators do not inherit either scope.
