# WS-03 Discovery Emitter · Falsification Gates

The slice fails if any of the following is observed:

1. a canonical object whose publicability disposition is BLOCK appears in RSS, Atom, JSON Feed or sitemap;
2. an emitted representation changes canonical object identity, epistemic state or publication authority;
3. `sfi_external_representations` records the emission as PUBLISHED without an observed external URL and time;
4. IndexNow absence/failure changes canonical publication state;
5. public MCP is duplicated rather than referenced through its existing read-only endpoint/resource;
6. sitemap, feeds and AI index derive from different public canonical object sets;
7. ROOT emission can write without ROOT actor authorization;
8. the emission writer creates a second canonical or external-representation persistence owner.
