# ROOT FIELD ENGINE CONTRACT

**Surface:** `/root`  
**Mode:** pixel-locked raster field with live ROOT Universe mapping  
**Asset expected:** `public/root/root-field-console.webp`  
**Canonical source dimensions:** `1672 x 941`

## 1. Phenomenon

ROOT is not treated as a conventional dashboard. ROOT is treated as a cognitive field: a navigable institutional surface where world vectors, evidence, predictions, proposals, agents, tools, governance rules, functions, research, expansion and outcomes are normalized into one common ontology.

The visible layer is intentionally frozen. If the image asset is present, `/root` renders the exact raster as the visible interface. The live institutional state is mapped to an invisible contract layer and is not allowed to mutate the image pixels.

## 2. Pixel-lock rule

No component, color, gradient, label, card, panel, animation or generated SVG may visually replace the canonical raster while the pixel lock is active.

The visible asset must live at:

```text
public/root/root-field-console.webp
```

The rendering wrapper preserves the source aspect ratio using:

```text
1672 / 941
```

This prevents crop distortion. On non-matching screens, the field is centered against the same dark background rather than stretched destructively.

## 3. Runtime behavior

`/root` still resolves the existing live state before rendering:

```text
buildWorldVectorOperationalState()
buildAgenticRootState()
getRootHudGovernanceSnapshot()
```

`RootFieldExactConsole` then maps those inputs into the ROOT Universe node contract.

When the raster asset exists, the raster becomes the only visible layer.

When the raster asset is missing, the previous live observatory remains as a fallback so production is not broken by a missing binary asset.

## 4. ROOT Universe ontology

The wrapper currently normalizes the live state into these node types:

```text
World Vector
Signal
Observation
Evidence
Prediction
Proposal
Agent
Tool
Governance Rule
Function
Research
Expansion
Outcome
```

This establishes the root layer for a later PixiJS or field-rendered engine without forcing visual mutation today.

## 5. Responsibility boundary

The current implementation does not pretend the raster is live. It keeps the visual layer exact and keeps live state as structured ontology metadata until a later design decision permits visible mutation.

That is the correct boundary: exact pixels and visible live overlays are mutually exclusive unless the overlay is already part of the raster.
