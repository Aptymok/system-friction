# SFI Agent Architecture Map

System Friction Institute repository operator/development agent map.

The `.github/agents/*.agent.md` files define bounded development/operator prompts. Their presence does **not** instantiate a Cognitive Runtime agent and does not prove runtime wiring.

Runtime truth is owned by the typed Cognitive Runtime stack:

- `src/lib/sfi/cognitive-runtime/registry.ts`;
- `src/lib/sfi/cognitive-runtime/convergedRegistry.ts`;
- `src/lib/sfi/cognitive-runtime/agentExecutionMap.ts`;
- `src/lib/sfi/cognitive-runtime/agentPassports.ts`.

A runtime capability is operational only when its typed registration, authority/passport projection, executor/trigger and observed execution state are evidenced. Documentation or prompt files alone are declaration evidence.

---

# CORE PRINCIPLE

One responsibility.

One contract.

One authority boundary.

Agents do not replace each other.

They collaborate through defined interfaces.

---

# CORE ARCHITECTURE

## Constitution and Control

| Agent | Responsibility |
|---|---|
| 00-sfi-constitution | Fundamental system principles |
| architect | Global architecture decisions |
| root-governance | ROOT authority and permissions |
| topology-guardian | System boundary protection |
| runtime | Cognitive Runtime operation |
| agent-lifecycle | Agent creation and evolution |

---

# COGNITIVE SYSTEM

| Agent | Responsibility |
|---|---|
| cognitive-twin | Cognitive representation |
| ai-architecture | AI system design |
| amv | Meaning interpretation |
| mihm | System state evaluation |
| prediction | Predictive models |
| model-validation | Model evaluation |

---

# REALITY AND EVIDENCE

| Agent | Responsibility |
|---|---|
| evidence | Evidence integrity |
| phenomenology | Phenomenological analysis |
| field | FIELD methodology |
| field-operations | Real-world execution |
| world-vector | External reality representation |
| archive | Historical preservation |

---

# KNOWLEDGE

| Agent | Responsibility |
|---|---|
| knowledge-manager | Active knowledge organization |
| documentation | Technical documentation |
| research-methodology | Scientific methodology |
| research-paper | Scientific publication |

---

# DATA SYSTEMS

| Agent | Responsibility |
|---|---|
| database | Database operations |
| data-engineering | Data pipelines |
| data-governance | Data ownership |
| schema-evolution | Schema changes |
| migration | Database migrations |
| analytics | Metrics and analysis |

---

# SOFTWARE ENGINEERING

| Agent | Responsibility |
|---|---|
| frontend | UI systems |
| integration | Module communication |
| api-contract | API stability |
| testing | Component tests |
| integration-test | End-to-end validation |
| deployment | Release deployment |
| release-manager | Release coordination |
| devops | Infrastructure |
| observability | Monitoring |
| performance | Optimization |

---

# GOVERNANCE AND SAFETY

| Agent | Responsibility |
|---|---|
| governance | Governance workflows |
| governance-auditor | Governance verification |
| auditor | System audit |
| compliance | Compliance requirements |
| legal | Legal analysis |
| ethics | Ethical constraints |
| security | Security controls |
| incident-response | Failure response |

---

# PRODUCT AND OPERATIONS

| Agent | Responsibility |
|---|---|
| product-strategy | Product direction |
| monetization | Revenue models |
| cost-optimization | Resource efficiency |
| operator | Operational procedures |
| communication | External communication |
| ux-research | User experience |

---

# VALIDATION

Before creating a new runtime agent or capability:

1. Search the canonical Cognitive Runtime registry and execution map.
2. Identify overlapping responsibilities.
3. Define the missing capability and authority ceiling.
4. Create or extend the typed contract.
5. Register the capability in the canonical runtime owner.
6. Attach passport/authority projection.
7. Wire an executor or explicit trigger.
8. Validate execution and persisted/observable lineage.

A new `.agent.md` prompt is not a substitute for these steps.

---

# DO NOT CREATE

Do not create:

- duplicate runtime agents,
- parallel runtimes,
- parallel evidence systems,
- duplicate governance layers,
- runtime agents without contracts,
- prompt files used as proof of runtime implementation.

---

# CURRENT SYSTEM STATUS

Agent prompt files:
Repository development/operator declarations.

Runtime registry:
Controlled through `SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY`.

Execution:
Controlled through `SFI_AGENT_EXECUTION_MAP` and the Cognitive Runtime.

Passports / authority:
Projected through `agentPassports.ts`, Cognitive Passport contracts and ROOT Governance boundaries.

Memory:
Protected through Evidence and Archive layers.

Evolution:
Controlled through Agent Lifecycle and governed capability registration; prompt-file creation alone does not evolve the runtime.

---

# END

SFI evolves through controlled differentiation.

More agents do not mean more intelligence.

Better boundaries create more intelligence.
