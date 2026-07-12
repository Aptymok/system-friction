# SFI External Evidence Vector

Each external observation is stored independently. Missing normalized values remain `null`; they are never replaced by zero, a mean, or a model prior.

Required provenance per observation:

- object and object class;
- source type and optional source reference;
- metric key and raw value;
- optional normalized value in `[0,1]`;
- reliability in `[0,1]`;
- evidence note;
- epistemic class;
- capture timestamp;
- operator;
- consent evidence when applicable.

The vector is a read model over observations. It reports documented keys, required keys, missing keys, coverage, and weighted reliability. It does not merge incompatible units and does not claim platform analytics as cultural value.
