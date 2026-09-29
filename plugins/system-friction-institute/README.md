# SYSTEM FRICTION INSTITUTE plugin

Public source package for the SFI plugin marketplace entry.

## MCP servers

- `https://www.systemfriction.org/api/mcp/authenticated`
- `https://www.systemfriction.org/api/mcp/studio`

Authentication is user-bound OAuth. Effective scopes remain the intersection of the OAuth client ceiling and the authenticated SFI principal's assigned authority.

Version 1.1.0 aligns the marketplace manifest with the current two-surface MCP contract.

Authenticated Gateway scopes:
- `observe`
- `propose`
- `execute`
- `governance:decide`
- `root:operate`
- `cases:read`
- `cases:write`
- `lab:read`
- `lab:write`
- `lab:run`

Studio scopes:
- `studio:read`
- `studio:content`
- `studio:run`

The package itself does not grant ROOT authority. `root:operate` and `governance:decide` remain separately controlled by live SFI identity, OAuth scope, tenant, and server-side authority checks. Non-ROOT operators do not inherit either scope.
