# SYSTEM FRICTION INSTITUTE plugin

Public source package for the SFI plugin marketplace entry.

## MCP servers

- `https://www.systemfriction.org/api/mcp/authenticated`
- `https://www.systemfriction.org/api/mcp/studio`

Authentication is user-bound OAuth. Effective scopes remain the intersection of the OAuth client ceiling and the authenticated SFI principal's assigned authority.

The plugin package does not grant ROOT authority. `governance:decide` remains separately controlled.
