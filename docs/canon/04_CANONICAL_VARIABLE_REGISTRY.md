# 04 · Canonical Variable Registry

**Status:** CANONICAL  
**Version:** 2026-08-06.variables.v1

A variable may be used canonically only when its registry entry declares:

- canonical identifier and display symbol;
- meaning and observed dimension;
- permitted object types and methods;
- data type, unit and valid range;
- origin classes allowed;
- missing-value policy;
- formula authority and version when derived;
- aliases and migration conditions.

Variable names are classified as:

- `CANONICAL`: valid for new records.
- `ALIAS_UNAMBIGUOUS`: automatically resolvable to one canonical identifier.
- `ALIAS_CONTEXTUAL`: resolvable only after method/object context is supplied.
- `DEPRECATED`: readable for history but invalid for new writes.
- `PROHIBITED`: must fail validation.
- `UNKNOWN`: not in the registry; must not be invented or silently accepted.

A redirect is safe only for an unambiguous alias. `PHI_SYSTEMIC → PHI_S` is safe. `PHI_SF` is contextual because historical records use it for both bounded systems and SFI. It must resolve from object context or remain conflicted.

The laboratory may propose variables, but proposed variables remain namespaced `LAB_*` until approved and registered. Production writers must reject unregistered identifiers.