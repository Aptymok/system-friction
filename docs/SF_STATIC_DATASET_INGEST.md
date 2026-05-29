# SFI Static Dataset Package

Source files:
- SF_nodes(2).json
- SF_docs(1).js

Parsed:
- nodes: 121
- edges: 377
- document frontmatter records: 117
- declared total documents: 121
- declared supplement documents: 94

Important:
- `sfStaticDataset.ts` is a compact metadata catalog. It does not include full document body content.
- `seed_sf_graph.sql` maps nodes and edges into the existing Supabase schema: `graph_nodes` and `graph_edges`.
- Review SQL before applying.
- The JS supplement parsed as `DOCS_V3`; the file declaration says supplement covers 94 missing docs, but the parsed object contains 117 records. This mismatch should be documented as a warning, not ignored.

Recommended repo placement:
- `src/observatory/field/catalog/sfStaticDataset.ts`
- `supabase/seed/seed_sf_graph.sql`
- `docs/SF_STATIC_DATASET_INGEST.md`
