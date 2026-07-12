# Public Observatory deployment contract

`/observatory` compiles against the current public World Vector state contract.

The `wsv` block must include:

- `globalIndex`
- `coherence`
- `resilience`
- `alignment`
- `tension`
- `regime`

This marker accompanies the post-merge redeployment after an older Vercel build compiled an intermediate Observatory revision that predated the explicit `regime` assignment.
