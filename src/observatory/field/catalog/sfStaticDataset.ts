/* Auto-generated compact catalog from uploaded SF_nodes.json + SF_docs_supplement_v3.js. Full document bodies are intentionally excluded. */

export const sfStaticDataset = {
  "metadata": {
    "version": "3.0",
    "updated": "2026-03-20",
    "total_nodes": 121,
    "total_documents": 121,
    "documents_populated": 27,
    "documents_supplement": 94,
    "mihm_version": "3.0",
    "monte_carlo_seed": 42,
    "reference_node": "nodo-ags",
    "reference_ihg": -0.62,
    "reference_nti": 0.351,
    "reference_state": "EMERGENCY_DECISION"
  },
  "mihm_v3_engine": {
    "source": "mihm_v3.json",
    "variables": [
      "SF_P_0003",
      "SF_P_0004",
      "SF_P_0005",
      "SF_P_0006",
      "SF_P_0007",
      "SF_P_0008",
      "SF_P_0009",
      "SF_P_0010",
      "SF_P_0011",
      "SF_P_0012",
      "SF_P_0022",
      "SF_P_0041",
      "SF_P_0060"
    ],
    "ihg_range": [
      -0.5,
      1.0
    ],
    "temporal_alpha": 0.3,
    "ucap_threshold": -0.4,
    "interactions": [
      "friction_coherence: F_s * C_s (w=0.10)",
      "density_energy: D_i*(1-E_r) (w=0.10)",
      "cognitive_semantic_delay: D_cog*(1-R_sem) (w=0.10)",
      "gradient_intent: G_f*(1-V_i) (w=0.10)",
      "semantic_cognitive_field: C_sem*Phi (w=0.10)"
    ]
  },
  "patterns_catalog": {
    "source": "patterns_v3.json",
    "total_patterns": 20,
    "pattern_ids": [
      "umbral-dual",
      "latencia-politica",
      "coherencia-aparente",
      "equilibrio-implicito",
      "agua-rentada",
      "decisión-emergente",
      "adoptable-degradado",
      "compliance-narrativo",
      "deuda-temporal",
      "escritura-sin-intención",
      "alerta-ignorada",
      "contexto-perdido",
      "incertidumbre-humana",
      "distancia-umbrales",
      "deuda-de-decisión",
      "incentivo-contradictorio",
      "señal-ruido",
      "proxy-objetivo",
      "desalineación-métricas",
      "metodología"
    ]
  },
  "observer": {
    "id": "APTYMOK",
    "node_id": "O_t",
    "equation": "S(t+1) = F(S(t), I(t), O(t))",
    "layer": "capa-0-campo-reflexivo",
    "icr_status": "PENDIENTE — requiere primera medición explícita con O(t)",
    "cara_b": "observacion_proceso_cara_B.md"
  },
  "nodes": [
    {
      "id": "SF_P_0001",
      "legacy_id": "SF_001",
      "name": "System Friction",
      "layer": "origin",
      "cluster": "SF_CLUSTER_01",
      "description": "System Friction es el sistema raíz del ecosistema. Proporciona el vocabulario operativo, la arquitectura conceptual y los principios para observar cómo los sistemas complejos acumulan entropía invisible bajo indicadores oficialmente estables.",
      "variables": [
        "friccion_sistémica",
        "latencia_institucional",
        "entropia_acumulada"
      ],
      "relations": [
        "SF_P_0002",
        "SF_P_0003",
        "SF_P_0010",
        "SF_P_0021",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0001"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0001",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "origin",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0002",
      "legacy_id": "SF_002",
      "name": "Campo Cognitivo",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "Campo Cognitivo es la capa puramente teórica del ecosistema. No es una marca ni producto; es la infraestructura conceptual que da coherencia al sistema de observación. Provee fundamentos filosóficos y metodológicos al marco analítico.",
      "variables": [
        "observacion_epistemica",
        "marco_logico"
      ],
      "relations": [
        "SF_P_0001",
        "SF_P_0003",
        "SF_P_0004",
        "SF_P_0021"
      ],
      "docRelations": [
        "SF_D_NODE_0002"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0002",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0003",
      "legacy_id": "SF_003",
      "name": "Fricción Sistémica",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "Fricción Sistémica es el concepto central del marco. Cuantifica la pérdida de señal entre la observación de una anomalía y la respuesta institucional verificable. Cuando la fricción supera la capacidad de respuesta, el colapso es matemáticamente inevitable.",
      "variables": [
        "señal_detectada",
        "respuesta_ejecutada",
        "latencia_institucional"
      ],
      "equations": [
        "FS = LDI / VR  (donde LDI=latencia decisional, VR=velocidad de respuesta)"
      ],
      "relations": [
        "SF_P_0001",
        "SF_P_0004",
        "SF_P_0041",
        "SF_P_0042"
      ],
      "docRelations": [
        "SF_D_NODE_0003"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0003",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "F_s",
        "formula": "(t_d/T_esp)+O",
        "weight": 0.1,
        "dimension": "structural"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0004",
      "legacy_id": "SF_004",
      "name": "Interacción Humana Multicanal",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Interacción Humana Multicanal reconoce que los sistemas institucionales operan con múltiples canales de señal simultáneos: formales, informales, tácitos y explícitos. La fricción emerge en los puntos de desacoplamiento entre canales.",
      "variables": [
        "canales_activos",
        "coherencia_señal",
        "ruido_canal"
      ],
      "relations": [
        "SF_P_0003",
        "SF_P_0005",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0004"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0004",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "I_mc",
        "formula": "1-(d_c/C_t)",
        "weight": 0.0833,
        "dimension": "relational"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0005",
      "legacy_id": "SF_005",
      "name": "Energía Relacional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Energía Relacional mide la vitalidad de los vínculos operativos entre agentes institucionales. Su degradación es un indicador temprano de fragmentación sistémica antes de que los indicadores oficiales lo registren.",
      "variables": [
        "capacidad_vincular",
        "degradacion_relacional",
        "resiliencia_vincular"
      ],
      "relations": [
        "SF_P_0003",
        "SF_P_0006",
        "SF_P_0044"
      ],
      "docRelations": [
        "SF_D_NODE_0005"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0005",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "E_r",
        "formula": "(C_v/T_m)*(1-D_f)",
        "weight": 0.0833,
        "dimension": "relational"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0006",
      "legacy_id": "SF_006",
      "name": "Densidad de Interacción",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Densidad de Interacción es una métrica que cuantifica la intensidad comunicacional de un sistema. Alta densidad con baja coherencia señal es un indicador clásico de fricción sistémica activa.",
      "variables": [
        "frecuencia_intercambio",
        "calidad_señal",
        "nodos_activos"
      ],
      "equations": [
        "DI = sum(interacciones_verificadas) / (nodos_activos * periodo_temporal)"
      ],
      "relations": [
        "SF_P_0005",
        "SF_P_0007",
        "SF_P_0046"
      ],
      "docRelations": [
        "SF_D_NODE_0006"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0006",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "D_i",
        "formula": "(I_t/N)/C_p",
        "weight": 0.075,
        "dimension": "temporal"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0007",
      "legacy_id": "SF_007",
      "name": "Gradiente de Fricción",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "El Gradiente de Fricción describe cómo la fricción no es uniforme en un sistema: se concentra en puntos específicos de la red, generando zonas de alta tensión estructural que actúan como catalizadores de colapso.",
      "variables": [
        "intensidad_friccion_local",
        "distribucion_nodal",
        "tension_acumulada"
      ],
      "equations": [
        "GF_ij = |FS_i - FS_j| / distancia_estructural_ij"
      ],
      "relations": [
        "SF_P_0003",
        "SF_P_0008",
        "SF_P_0057"
      ],
      "docRelations": [
        "SF_D_NODE_0007"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0007",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "G_f",
        "formula": "max(|F_s_i-F_s_j|/d_ij)",
        "weight": 0.1,
        "dimension": "structural"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0008",
      "legacy_id": "SF_008",
      "name": "Coherencia Sistémica",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Coherencia Sistémica es un indicador de la salud estructural de una institución. Su degradación no suele detectarse en los indicadores oficiales porque la institución tiene incentivos para mantener la apariencia de coherencia mientras la realidad operativa diverge.",
      "variables": [
        "alineacion_objetivos",
        "consistencia_señal",
        "divergencia_declarada"
      ],
      "equations": [
        "CS = 1 - (divergencia_real / estado_declarado)"
      ],
      "relations": [
        "SF_P_0007",
        "SF_P_0009",
        "SF_P_0031"
      ],
      "docRelations": [
        "SF_D_NODE_0008"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0008",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "C_s",
        "formula": "1-|D_o-R_o|/max(D_o,0.01)",
        "weight": 0.1,
        "dimension": "cognitive"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0009",
      "legacy_id": "SF_009",
      "name": "Desfase Cognitivo",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "El Desfase Cognitivo es la brecha entre lo que una institución cree que está ocurriendo y lo que está ocurriendo. Es la fuente primaria de latencia institucional: decisiones tomadas sobre una realidad que ya no existe cuando se actúa.",
      "variables": [
        "percepcion_institucional",
        "estado_real",
        "lag_temporal"
      ],
      "equations": [
        "DC = |t_percepcion - t_evento| * factor_semantic_drift"
      ],
      "relations": [
        "SF_P_0008",
        "SF_P_0010",
        "SF_P_0030"
      ],
      "docRelations": [
        "SF_D_NODE_0009"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0009",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "D_cog",
        "formula": "t_d/t_ref",
        "weight": 0.075,
        "dimension": "temporal"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0010",
      "legacy_id": "SF_010",
      "name": "Resonancia Semántica",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Resonancia Semántica es crítica para la eficacia institucional. Cuando dos nodos usan los mismos términos con significados distintos, la señal se degrada sin que los agentes lo perciban. Este fenómeno es la causa más subestimada de fricción sistémica.",
      "variables": [
        "coherencia_semantica",
        "alineacion_terminologica",
        "drift_semantico"
      ],
      "relations": [
        "SF_P_0009",
        "SF_P_0011",
        "SF_P_0044"
      ],
      "docRelations": [
        "SF_D_NODE_0010"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0010",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "umbral-dual",
        "decisión-emergente",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "R_sem",
        "formula": "(T_com/T_total)*(1-D_sem)",
        "weight": 0.1,
        "dimension": "semantic"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0011",
      "legacy_id": "SF_011",
      "name": "Vector Intencional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "El Vector Intencional reconoce que los agentes institucionales operan con múltiples capas de intención: la declarada (visible en reportes), la real (que guía las decisiones) y la sistémica (que el propio agente no reconoce conscientemente). La divergencia entre estas capas produce fricción.",
      "variables": [
        "intencion_declarada",
        "intencion_real",
        "alineacion_vectorial"
      ],
      "relations": [
        "SF_P_0010",
        "SF_P_0012",
        "SF_P_0032"
      ],
      "docRelations": [
        "SF_D_NODE_0011"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0011",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "V_i",
        "formula": "(I_r/I_d)*(1-D_i_vec)",
        "weight": 0.0833,
        "dimension": "relational"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0012",
      "legacy_id": "SF_012",
      "name": "Campo Semántico Compartido",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "El Campo Semántico Compartido es el sustrato invisible de la coordinación institucional. Su degradación no produce conflictos abiertos sino conversaciones cada vez menos eficaces. Es uno de los primeros indicadores de fragmentación sistémica.",
      "variables": [
        "vocabulario_compartido",
        "marcos_comunes",
        "estabilidad_semantica"
      ],
      "relations": [
        "SF_P_0010",
        "SF_P_0011",
        "SF_P_0034"
      ],
      "docRelations": [
        "SF_D_NODE_0012"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0012",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "C_sem",
        "formula": "V_com/V_total",
        "weight": 0.1,
        "dimension": "semantic"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0013",
      "legacy_id": "SF_013",
      "name": "Ruido Cognitivo",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "El Ruido Cognitivo no es la ausencia de información sino su exceso no filtrado. Los sistemas modernos generan más señal de la que pueden procesar coherentemente, y el ruido se acumula como costo cognitivo que degrada la calidad de las decisiones.",
      "variables": [
        "señal_ruido",
        "carga_cognitiva",
        "filtro_institucional"
      ],
      "equations": [
        "RC = señales_recibidas / señales_accionables"
      ],
      "relations": [
        "SF_P_0012",
        "SF_P_0014",
        "SF_P_0047",
        "SF_P_0061"
      ],
      "docRelations": [
        "SF_D_NODE_0013"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0013",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0014",
      "legacy_id": "SF_014",
      "name": "Latencia Conversacional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Latencia Conversacional es la dimensión temporal de la fricción sistémica. Los sistemas críticos tienen umbrales de latencia por encima de los cuales la información pierde valor operativo. Cuando la latencia supera ese umbral, la señal se convierte en ruido histórico.",
      "variables": [
        "t_emision",
        "t_recepcion",
        "t_procesamiento",
        "umbral_latencia"
      ],
      "equations": [
        "LC = t_procesamiento - t_emision",
        "LC_critica: if LC > umbral_latencia  ?' señal_inválida"
      ],
      "relations": [
        "SF_P_0013",
        "SF_P_0015",
        "SF_P_0046"
      ],
      "docRelations": [
        "SF_D_NODE_0014"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0014",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0015",
      "legacy_id": "SF_015",
      "name": "Divergencia de Interpretación",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Divergencia de Interpretación es la forma más costosa de fricción porque no requiere conflicto abierto: los agentes actúan de buena fe sobre interpretaciones distintas del mismo acuerdo. El costo se detecta solo cuando los resultados divergen de lo acordado.",
      "variables": [
        "interpretacion_A",
        "interpretacion_B",
        "distancia_semantica"
      ],
      "relations": [
        "SF_P_0010",
        "SF_P_0014",
        "SF_P_0049"
      ],
      "docRelations": [
        "SF_D_NODE_0015"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0015",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0016",
      "legacy_id": "SF_016",
      "name": "Sincronización Cognitiva",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Sincronización Cognitiva es el opuesto de la latencia y el desfase. Es el estado de alta salud sistémica en que las señales se procesan coherentemente y las respuestas llegan antes de que el problema evolucione.",
      "variables": [
        "alineacion_temporal",
        "coherencia_marco",
        "velocidad_respuesta"
      ],
      "relations": [
        "SF_P_0009",
        "SF_P_0015",
        "SF_P_0051"
      ],
      "docRelations": [
        "SF_D_NODE_0016"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0016",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0017",
      "legacy_id": "SF_017",
      "name": "Canal de Señal Social",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "Los Canales de Señal Social son la infraestructura de la coordinación institucional. Su degradación produce pérdida de información crítica aunque los canales formales sigan activos. Los sistemas de fricción alta típicamente tienen canales formales intactos y canales reales degradados.",
      "variables": [
        "fidelidad_canal",
        "latencia_canal",
        "cobertura_nodal"
      ],
      "relations": [
        "SF_P_0016",
        "SF_P_0018",
        "SF_P_0026"
      ],
      "docRelations": [
        "SF_D_NODE_0017"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0017",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0018",
      "legacy_id": "SF_018",
      "name": "Fricción Adaptativa",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "No toda fricción es destructiva. La Fricción Adaptativa es la resistencia que permite al sistema evaluar señales antes de responder impulsivamente. Su eliminación total produce inestabilidad. Su exceso produce parálisis. El modelo MIHM busca el punto de fricción óptima.",
      "variables": [
        "friccion_reguladora",
        "velocidad_cambio",
        "estabilidad_respuesta"
      ],
      "relations": [
        "SF_P_0003",
        "SF_P_0019",
        "SF_P_0052"
      ],
      "docRelations": [
        "SF_D_NODE_0018"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0018",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0019",
      "legacy_id": "SF_019",
      "name": "Memoria Sistémica",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "La Memoria Sistémica no es el archivo: es la capacidad de usar la historia para informar decisiones presentes. Su pérdida produce que los sistemas cometan los mismos errores sistemáticamente porque no tienen acceso a los patrones que ya enfrentaron.",
      "variables": [
        "retencion_historica",
        "acceso_operativo",
        "decaimiento_memoria"
      ],
      "relations": [
        "SF_P_0009",
        "SF_P_0018",
        "SF_P_0050"
      ],
      "docRelations": [
        "SF_D_NODE_0019"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0019",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0020",
      "legacy_id": "SF_020",
      "name": "Equilibrio Relacional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_01",
      "description": "El Equilibrio Relacional no es armonía; es estabilidad funcional. Un sistema puede tener conflictos activos y mantener equilibrio relacional si los conflictos tienen canales de resolución operativos. El desequilibrio destructivo ocurre cuando los conflictos bloquean la coordinación.",
      "variables": [
        "estabilidad_vincular",
        "costo_mantenimiento",
        "capacidad_resolucion"
      ],
      "relations": [
        "SF_P_0005",
        "SF_P_0019",
        "SF_P_0037",
        "SF_P_0055"
      ],
      "docRelations": [
        "SF_D_NODE_0020"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0020",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "señal-ruido",
        "latencia-politica",
        "contexto-perdido"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 0,
        "base_angle": 0,
        "description": "Conceptos fundacionales del sistema"
      }
    },
    {
      "id": "SF_P_0021",
      "legacy_id": "SF_021",
      "name": "Marco Teórico System Friction",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Marco Teórico de System Friction integra conceptos de teoría de sistemas, entropía de Shannon, Ley de Goodhart y latencia institucional en un esquema coherente de observación y diagnóstico de sistemas complejos.",
      "relations": [
        "SF_P_0001",
        "SF_P_0022",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0021"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0021",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0022",
      "legacy_id": "SF_022",
      "name": "Teoría de Campos Cognitivos",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Teoría de Campos Cognitivos propone que el conocimiento institucional no es discreto sino continuo: forma campos con gradientes, zonas de alta densidad (expertise concentrado) y zonas de baja densidad (vacíos de conocimiento operativo).",
      "variables": [
        "densidad_campo",
        "gradiente_cognitivo",
        "perturbacion_campo"
      ],
      "equations": [
        " ^?² ? = ρ_cognitiva (analogía con ecuación de Poisson)"
      ],
      "relations": [
        "SF_P_0021",
        "SF_P_0023",
        "SF_P_0043"
      ],
      "docRelations": [
        "SF_D_NODE_0022"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0022",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "Phi",
        "formula": "sum(w_i*K(x,x_i))",
        "weight": 0.1,
        "dimension": "cognitive"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0023",
      "legacy_id": "SF_023",
      "name": "Dinámica de Interacciones Humanas",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Dinámica de Interacciones Humanas reconoce que los sistemas institucionales son sistemas dinámicos con atractores, bifurcaciones y comportamiento caótico bajo ciertas condiciones de fricción. Su análisis permite anticipar transiciones críticas.",
      "variables": [
        "patron_interaccion",
        "trayectoria_dinamica",
        "atractor_sistemico"
      ],
      "equations": [
        "dX/dt = F(X, friccion, t)"
      ],
      "relations": [
        "SF_P_0022",
        "SF_P_0024",
        "SF_P_0033"
      ],
      "docRelations": [
        "SF_D_NODE_0023"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0023",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0024",
      "legacy_id": "SF_024",
      "name": "Modelo de Energía Relacional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Energía Relacional formaliza la intuición de que las instituciones tienen recursos limitados para mantener relaciones. La distribución de esa energía entre nodos determina qué vínculos sobreviven bajo estrés y cuáles colapsan primero.",
      "variables": [
        "energia_total",
        "distribucion_nodal",
        "tasa_consumo"
      ],
      "equations": [
        "E_total = sum(E_ij) para todos los vínculos activos"
      ],
      "relations": [
        "SF_P_0005",
        "SF_P_0023",
        "SF_P_0048"
      ],
      "docRelations": [
        "SF_D_NODE_0024"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0024",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0025",
      "legacy_id": "SF_025",
      "name": "Topología de Sistemas Sociales",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Topología de Sistemas Sociales proporciona el mapa estructural sobre el que se calculan todas las métricas MIHM. La misma fricción tiene efectos distintos según la posición topológica del nodo afectado: no es lo mismo que falle un nodo periférico que un nodo articulador.",
      "variables": [
        "grado_nodal",
        "centralidad",
        "clustering_coefficient"
      ],
      "relations": [
        "SF_P_0024",
        "SF_P_0026",
        "SF_P_0063"
      ],
      "docRelations": [
        "SF_D_NODE_0025"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0025",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0026",
      "legacy_id": "SF_026",
      "name": "Arquitectura de Señal Humana",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Arquitectura de Señal Humana formaliza la descripción de cómo circula la información en una institución: qué canales existen, cuáles son formales, cuáles son reales, dónde se producen pérdidas y dónde se introduce ruido.",
      "variables": [
        "canales_activos",
        "fidelidad",
        "cobertura",
        "puntos_fallo"
      ],
      "relations": [
        "SF_P_0017",
        "SF_P_0025",
        "SF_P_0035"
      ],
      "docRelations": [
        "SF_D_NODE_0026"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0026",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0027",
      "legacy_id": "SF_027",
      "name": "Modelo de Ruido Social",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Ruido Social categoriza los tipos de interferencia que degradan la señal institucional: ruido estructural (producido por la arquitectura), ruido motivacional (producido por incentivos), ruido semántico (producido por divergencia de marcos) y ruido de latencia (producido por el tiempo).",
      "variables": [
        "tipo_ruido",
        "intensidad",
        "fuente_estructural"
      ],
      "equations": [
        "SNR = Potencia_señal / Potencia_ruido"
      ],
      "relations": [
        "SF_P_0013",
        "SF_P_0026",
        "SF_P_0058"
      ],
      "docRelations": [
        "SF_D_NODE_0027"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0027",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0028",
      "legacy_id": "SF_028",
      "name": "Principio de Fricción Cognitiva",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Principio de Fricción Cognitiva establece que la fricción es una propiedad emergente del sistema, no una característica individual de sus agentes. Por tanto, las intervenciones efectivas son sistémicas, no personales.",
      "relations": [
        "SF_P_0003",
        "SF_P_0021",
        "SF_P_0036"
      ],
      "docRelations": [
        "SF_D_NODE_0028"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0028",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0029",
      "legacy_id": "SF_029",
      "name": "Teoría de Resonancia Social",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Teoría de Resonancia Social describe cómo ciertos patrones de comportamiento se amplifican a través del sistema cuando encuentran condiciones estructurales favorables, análogamente a la resonancia en sistemas físicos.",
      "variables": [
        "frecuencia_patron",
        "amplitud",
        "condicion_resonancia"
      ],
      "relations": [
        "SF_P_0010",
        "SF_P_0028",
        "SF_P_0044"
      ],
      "docRelations": [
        "SF_D_NODE_0029"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0029",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0030",
      "legacy_id": "SF_030",
      "name": "Teoría de Desfase Conversacional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Teoría de Desfase Conversacional formaliza el patrón descrito en doc-07 (Contexto perdido): la información pierde precisión con el tiempo, y las decisiones tomadas sobre información desfasada acumulan error sistemático.",
      "variables": [
        "t_evento",
        "t_registro",
        "t_decision",
        "drift_informacional"
      ],
      "equations": [
        "Desfase = (t_decision - t_evento) * tasa_degradacion"
      ],
      "relations": [
        "SF_P_0009",
        "SF_P_0029",
        "SF_P_0046"
      ],
      "docRelations": [
        "SF_D_NODE_0030"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0030",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0031",
      "legacy_id": "SF_031",
      "name": "Modelo de Coherencia de Grupo",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Coherencia de Grupo distingue entre la coherencia declarada (el equipo dice estar alineado) y la coherencia operativa (el equipo actúa alineado). La brecha entre ambas es un predictor temprano de disfunción.",
      "variables": [
        "coherencia_declarada",
        "coherencia_operativa",
        "brecha_coherencia"
      ],
      "relations": [
        "SF_P_0008",
        "SF_P_0030",
        "SF_P_0032"
      ],
      "docRelations": [
        "SF_D_NODE_0031"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0031",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0032",
      "legacy_id": "SF_032",
      "name": "Modelo de Alineación Intencional",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Alineación Intencional distingue entre la alineación nominal (todos dicen querer lo mismo) y la alineación operativa (todos actúan hacia lo mismo). La delineación de esta diferencia es esencial para el diagnóstico de fricción.",
      "variables": [
        "intencion_declarada",
        "intencion_real",
        "objetivo_institucional"
      ],
      "relations": [
        "SF_P_0011",
        "SF_P_0031",
        "SF_P_0036"
      ],
      "docRelations": [
        "SF_D_NODE_0032"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0032",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0033",
      "legacy_id": "SF_033",
      "name": "Teoría de Sistemas Conversacionales",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Teoría de Sistemas Conversacionales reconoce que una conversación institucional no es solo un intercambio de información: es un sistema dinámico con sus propios atractores, resistencias y potencial de cambio de estado.",
      "variables": [
        "estado_conversacional",
        "transicion",
        "patron_recurrente"
      ],
      "relations": [
        "SF_P_0023",
        "SF_P_0032",
        "SF_P_0066"
      ],
      "docRelations": [
        "SF_D_NODE_0033"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0033",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0034",
      "legacy_id": "SF_034",
      "name": "Modelo de Campo Semántico",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Campo Semántico formaliza cómo el significado se distribuye en una institución: hay zonas de alta densidad semántica (términos bien definidos y compartidos) y zonas de baja densidad (términos ambiguos o disputados). La fricción aumenta en las zonas de baja densidad.",
      "variables": [
        "densidad_semantica",
        "ambiguedad_local",
        "estabilidad_semantica"
      ],
      "relations": [
        "SF_P_0012",
        "SF_P_0033",
        "SF_P_0043"
      ],
      "docRelations": [
        "SF_D_NODE_0034"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0034",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0035",
      "legacy_id": "SF_035",
      "name": "Arquitectura de Interacción",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Arquitectura de Interacción describe el diseño (implícito o explícito) de cómo un sistema organiza sus interacciones. Una arquitectura bien diseñada reduce la fricción estructural; una arquitectura disfuncional la genera sistemáticamente.",
      "variables": [
        "estructura_canales",
        "protocolos_interaccion",
        "puntos_articulacion"
      ],
      "relations": [
        "SF_P_0026",
        "SF_P_0034",
        "SF_P_0062"
      ],
      "docRelations": [
        "SF_D_NODE_0035"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0035",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0036",
      "legacy_id": "SF_036",
      "name": "Modelo de Perturbación Cognitiva",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Perturbación Cognitiva describe cómo los shocks externos o internos se propagan a través del campo cognitivo de una institución, generando fricción transitoria o estructural dependiendo de la resiliencia del sistema.",
      "variables": [
        "intensidad_perturbacion",
        "propagacion",
        "resiliencia_cognitiva"
      ],
      "relations": [
        "SF_P_0028",
        "SF_P_0035",
        "SF_P_0053"
      ],
      "docRelations": [
        "SF_D_NODE_0036"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0036",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0037",
      "legacy_id": "SF_037",
      "name": "Teoría de Equilibrio Social",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Teoría de Equilibrio Social en System Friction distingue entre equilibrios estables (el sistema regresa activamente a su estado), equilibrios inestables (cualquier perturbación aleja al sistema) y equilibrios metaestables (estables localmente, inestables globalmente).",
      "variables": [
        "tipo_equilibrio",
        "basin_atraccion",
        "mecanismo_retorno"
      ],
      "relations": [
        "SF_P_0020",
        "SF_P_0036",
        "SF_P_0055"
      ],
      "docRelations": [
        "SF_D_NODE_0037"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0037",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0038",
      "legacy_id": "SF_038",
      "name": "Modelo de Dinámica de Fricción",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo de Dinámica de Fricción describe la fricción no como un estado sino como un proceso: se acumula, se redistribuye y se libera. La liberación abrupta es el colapso; la distribución controlada es la gestión efectiva de la fricción.",
      "variables": [
        "tasa_acumulacion",
        "tasa_disipacion",
        "distribucion_espacial"
      ],
      "equations": [
        "dFS/dt = acumulacion(t) - disipacion(t)"
      ],
      "relations": [
        "SF_P_0003",
        "SF_P_0037",
        "SF_P_0060"
      ],
      "docRelations": [
        "SF_D_NODE_0038"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0038",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0039",
      "legacy_id": "SF_039",
      "name": "Teoría de Transferencia Semántica",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "La Teoría de Transferencia Semántica reconoce que el significado no se transmite perfectamente entre agentes. Cada transferencia introduce variación. La acumulación de variación produce divergencia semántica que es fuente de fricción.",
      "variables": [
        "fidelidad_transferencia",
        "variacion_semantica",
        "acumulacion_divergencia"
      ],
      "relations": [
        "SF_P_0012",
        "SF_P_0038",
        "SF_P_0050"
      ],
      "docRelations": [
        "SF_D_NODE_0039"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0039",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0040",
      "legacy_id": "SF_040",
      "name": "Modelo Global de Interacción Humana",
      "layer": "theory",
      "cluster": "SF_CLUSTER_02",
      "description": "El Modelo Global de Interacción Humana es la integración teórica de los conceptos anteriores en un marco unificado. Proporciona el fundamento teórico completo del motor MIHM.",
      "relations": [
        "SF_P_0021",
        "SF_P_0039",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0040"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0040",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "metodología",
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "theory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 1,
        "base_angle": 45,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0041",
      "legacy_id": "SF_041",
      "name": "Modelo MIHM",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "MIHM es el framework algorítmico principal diseñado para detectar, predecir y redirigir la entropía sistémica antes del punto de colapso. Integra múltiples índices (IHG, ICE, CRM, NTI) en un diagnóstico cuantitativo de salud institucional.",
      "variables": [
        "IHG",
        "ICE",
        "CRM",
        "Psi",
        "NTI",
        "LDI"
      ],
      "equations": [
        "MIHM_score = f(IHG, ICE, CRM, Psi, NTI)",
        "IHG = funcion_homeostasis(variables_entrada)",
        "ICE = suma_ponderada(carga_ejecutiva)"
      ],
      "relations": [
        "SF_P_0001",
        "SF_P_0040",
        "SF_P_0042",
        "SF_P_0062",
        "SF_P_0061"
      ],
      "docRelations": [
        "SF_D_NODE_0041"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0041",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "IHG",
        "formula": "sum(w_i*X_i)-sum(w_ij*int_ij)",
        "weight": 1.0,
        "dimension": "aggregate"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0042",
      "legacy_id": "SF_042",
      "name": "Ecuación de Fricción Cognitiva",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Ecuación de Fricción Cognitiva es la expresión matemática central del modelo MIHM. Traduce los conceptos de fricción sistémica en una fórmula computable que produce un valor numérico para cada par de nodos del sistema.",
      "variables": [
        "distancia_semantica",
        "energia_interaccion",
        "latencia_temporal",
        "nivel_ruido"
      ],
      "equations": [
        "FC(i,j) = d_sem(i,j) * (1 + λ_t) * N_cognitivo / E_relacional",
        "donde d_sem = distancia semántica",
        "λ_t = latencia temporal",
        "N_cognitivo = ruido cognitivo",
        "E_relacional = energía relacional"
      ],
      "relations": [
        "SF_P_0003",
        "SF_P_0035",
        "SF_P_0041",
        "SF_P_0069"
      ],
      "docRelations": [
        "SF_D_NODE_0042"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0042",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0043",
      "legacy_id": "SF_043",
      "name": "Modelo de Campo Semántico (Matemático)",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Modelo de Campo Semántico Matemático traduce la descripción conceptual del campo semántico en un objeto matemático formal: un campo escalar definido sobre el espacio de nodos del sistema, con gradientes y operadores diferenciales.",
      "variables": [
        "potencial_semantico",
        "gradiente_semantico",
        "laplaciano_semantico"
      ],
      "equations": [
        " ?(x) = potencial_semantico_en_nodo_x",
        " ^? ? = gradiente_semantico",
        " ^?² ? = divergencia_del_campo (positiva: fuente, negativa: sumidero)"
      ],
      "relations": [
        "SF_P_0034",
        "SF_P_0042",
        "SF_P_0059"
      ],
      "docRelations": [
        "SF_D_NODE_0043"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0043",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0044",
      "legacy_id": "SF_044",
      "name": "Métrica de Resonancia",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Métrica de Resonancia (MR) detecta cuando dos o más nodos del sistema se están sincronizando de manera que sus variaciones se amplifican mutuamente. Valores altos de MR pueden indicar sincronización funcional o riesgo de cascada disfuncional.",
      "variables": [
        "MR",
        "correlacion_nodal",
        "amplitud_compartida"
      ],
      "equations": [
        "MR(i,j) = correlacion(serie_i, serie_j) * amplitud_media(i,j)",
        "MR_sistema = max(MR_ij) para todos los pares"
      ],
      "relations": [
        "SF_P_0029",
        "SF_P_0043",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0044"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0044",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0045",
      "legacy_id": "SF_045",
      "name": "Índice de Coherencia Conversacional",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Índice de Coherencia Conversacional (ICC) mide qué proporción de los intercambios en un sistema produce alineación semántica verificable. Es un indicador de la eficiencia conversacional del sistema.",
      "variables": [
        "ICC",
        "intercambios_alineados",
        "intercambios_totales"
      ],
      "equations": [
        "ICC = intercambios_alineados / intercambios_totales * (1 - ruido_contextual)"
      ],
      "relations": [
        "SF_P_0008",
        "SF_P_0044",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0045"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0045",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0046",
      "legacy_id": "SF_046",
      "name": "Función de Latencia Social",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Función de Latencia Social describe la latencia no como un valor fijo sino como una función dinámica que depende del estado del sistema. Permite predecir cómo cambiará la latencia bajo diferentes condiciones.",
      "variables": [
        "carga_comunicacional",
        "topologia",
        "estado_friccion"
      ],
      "equations": [
        "L(t) = L_base * (1 + α*friccion(t)) * (1 + β*carga(t)) / capacidad_procesamiento(t)"
      ],
      "relations": [
        "SF_P_0014",
        "SF_P_0045",
        "SF_P_0041",
        "SF_P_0061"
      ],
      "docRelations": [
        "SF_D_NODE_0046"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0046",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0047",
      "legacy_id": "SF_047",
      "name": "Métrica de Ruido Cognitivo",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Métrica de Ruido Cognitivo (MRC) cuantifica qué proporción de la capacidad cognitiva del sistema se consume en procesar señales que no generan acción correcta. Es un indicador de ineficiencia sistémica.",
      "variables": [
        "MRC",
        "señales_procesadas",
        "señales_accionables",
        "carga_cognitiva"
      ],
      "equations": [
        "MRC = 1 - (señales_accionables / señales_procesadas)"
      ],
      "relations": [
        "SF_P_0013",
        "SF_P_0046",
        "SF_P_0041",
        "SF_P_0061"
      ],
      "docRelations": [
        "SF_D_NODE_0047"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0047",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0048",
      "legacy_id": "SF_048",
      "name": "Modelo de Energía de Interacción",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Modelo de Energía de Interacción formaliza el concepto de energía relacional en términos matemáticos, permitiendo calcular el balance energético de cada interacción y la disponibilidad de energía para interacciones futuras.",
      "variables": [
        "energia_disponible",
        "energia_consumida",
        "balance_energetico"
      ],
      "equations": [
        "E_balance(t) = E_disponible(t) - E_consumida(t)",
        "E_disponible(t+1) = E_balance(t) + E_recuperacion(t)"
      ],
      "relations": [
        "SF_P_0024",
        "SF_P_0047",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0048"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0048",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0049",
      "legacy_id": "SF_049",
      "name": "Métrica de Divergencia Semántica",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Métrica de Divergencia Semántica (MDS) mide qué tan diferentes son los significados que distintos nodos asignan a los términos clave del sistema. Es el cuantificador directo del fenómeno descrito en la Teoría de Transferencia Semántica.",
      "variables": [
        "MDS",
        "distancia_semantica",
        "alineacion_terminologica"
      ],
      "equations": [
        "MDS(i,j) = distancia_coseno(vector_semantico_i, vector_semantico_j)"
      ],
      "relations": [
        "SF_P_0015",
        "SF_P_0048",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0049"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0049",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0050",
      "legacy_id": "SF_050",
      "name": "Modelo de Transferencia de Significado",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Modelo de Transferencia de Significado formaliza matemáticamente cómo el significado fluye entre nodos, incluyendo la fidelidad de la transferencia, las pérdidas y la acumulación de variación.",
      "variables": [
        "fidelidad",
        "tasa_perdida",
        "acumulacion_variacion"
      ],
      "equations": [
        "S(n) = S(0) * prod(f_i) para i=1 a n transferencias",
        "donde f_i es la fidelidad de la i-ésima transferencia"
      ],
      "relations": [
        "SF_P_0039",
        "SF_P_0049",
        "SF_P_0043"
      ],
      "docRelations": [
        "SF_D_NODE_0050"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0050",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0051",
      "legacy_id": "SF_051",
      "name": "Índice de Sincronización Cognitiva",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Índice de Sincronización Cognitiva (ISC) mide qué tan sincronizados están los ciclos de procesamiento de información y toma de decisión entre los distintos nodos del sistema. Alta sincronización indica coordinación efectiva.",
      "variables": [
        "ISC",
        "sincronizacion_temporal",
        "alineacion_semantica"
      ],
      "equations": [
        "ISC = (sincronizacion_temporal * alineacion_semantica)^0.5"
      ],
      "relations": [
        "SF_P_0016",
        "SF_P_0050",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0051"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0051",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0052",
      "legacy_id": "SF_052",
      "name": "Métrica de Fricción Adaptativa",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Métrica de Fricción Adaptativa (MFA) distingue entre la fricción que el sistema necesita para funcionar correctamente (adaptativa) y la fricción que lo degrada (destructiva). Esta distinción es clave para diseñar intervenciones correctas.",
      "variables": [
        "MFA",
        "friccion_adaptativa",
        "friccion_destructiva"
      ],
      "equations": [
        "MFA = friccion_adaptativa / friccion_total",
        "friccion_total = friccion_adaptativa + friccion_destructiva"
      ],
      "relations": [
        "SF_P_0018",
        "SF_P_0051",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0052"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0052",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0053",
      "legacy_id": "SF_053",
      "name": "Función de Perturbación Conversacional",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Función de Perturbación Conversacional describe cómo el estado de un sistema de comunicación institucional cambia ante perturbaciones, permitiendo calcular el umbral de perturbaciones que el sistema puede absorber sin cambio de estado.",
      "variables": [
        "intensidad_perturbacion",
        "tipo_perturbacion",
        "respuesta_sistema"
      ],
      "equations": [
        "R(P) = R_0 + α*P + β*P² + ... (expansión en potencias)",
        "para |P| < P_critica",
        "el sistema permanece en su atractor actual"
      ],
      "relations": [
        "SF_P_0036",
        "SF_P_0052",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0053"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0053",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0054",
      "legacy_id": "SF_054",
      "name": "Métrica de Densidad de Interacción",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Métrica de Densidad de Interacción (MDI) cuantifica la intensidad comunicacional del sistema. Se diferencia del mero conteo de interacciones al normalizar por la capacidad de procesamiento del sistema.",
      "variables": [
        "MDI",
        "interacciones_periodo",
        "nodos_activos",
        "capacidad_procesamiento"
      ],
      "equations": [
        "MDI = interacciones_verificadas / (nodos_activos * periodo * capacidad_procesamiento)"
      ],
      "relations": [
        "SF_P_0006",
        "SF_P_0053",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0054"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0054",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0055",
      "legacy_id": "SF_055",
      "name": "Modelo de Estabilidad Relacional",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Modelo de Estabilidad Relacional formaliza qué hace que un vínculo institucional sea estable: su energía, su redundancia y su resistencia a perturbaciones. Permite predecir qué vínculos fallarán primero bajo estrés.",
      "variables": [
        "energia_vinculo",
        "redundancia",
        "resistencia_perturbacion"
      ],
      "equations": [
        "E_estabilidad(i,j) = E_relacional(i,j) / perturbacion_esperada(i,j)"
      ],
      "relations": [
        "SF_P_0020",
        "SF_P_0054",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0055"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0055",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0056",
      "legacy_id": "SF_056",
      "name": "Índice de Equilibrio Sistémico",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Índice de Equilibrio Sistémico (IES) es un indicador de alto nivel que integra información de múltiples métricas MIHM para producir una evaluación única de qué tan cerca está el sistema de su estado de equilibrio funcional.",
      "variables": [
        "IES",
        "distancia_equilibrio",
        "trayectoria_sistema"
      ],
      "equations": [
        "IES = 1 - (distancia_al_equilibrio / distancia_maxima_posible)",
        "IES = f(ISC, ICC, MFA, MDI, MRC)"
      ],
      "relations": [
        "SF_P_0037",
        "SF_P_0055",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0056"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0056",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0057",
      "legacy_id": "SF_057",
      "name": "Modelo de Gradiente de Fricción",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Modelo de Gradiente de Fricción formaliza la descripción de cómo la fricción se distribuye de manera no uniforme en el grafo del sistema, con concentraciones en ciertos nodos y vínculos que actúan como puntos de falla.",
      "variables": [
        "gradiente_friccion",
        "distribucion_espacial",
        "evolucion_temporal"
      ],
      "equations": [
        "GF(x) =  ^?FS(x) = ( ^,FS/ ^,x,  ^,FS/ ^,y)",
        "|GF| = magnitud del gradiente en cada punto del espacio del grafo"
      ],
      "relations": [
        "SF_P_0007",
        "SF_P_0056",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0057"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0057",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0058",
      "legacy_id": "SF_058",
      "name": "Métrica de Ruido Social",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Métrica de Ruido Social (MRS) distingue el ruido de origen social del ruido técnico. El ruido social es producido por los incentivos, las dinámicas de poder y las narrativas culturales que distorsionan las señales institucionales.",
      "variables": [
        "MRS",
        "ruido_motivacional",
        "ruido_cultural",
        "ruido_politico"
      ],
      "equations": [
        "MRS = (ruido_motivacional + ruido_cultural + ruido_politico) / señal_total"
      ],
      "relations": [
        "SF_P_0027",
        "SF_P_0057",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0058"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0058",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0059",
      "legacy_id": "SF_059",
      "name": "Modelo de Campo Conversacional",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El Modelo de Campo Conversacional trata las conversaciones institucionales no como eventos discretos sino como manifestaciones de un campo continuo, permitiendo análisis de tendencias, patrones y predicción de estados futuros.",
      "variables": [
        "flujo_conversacional",
        "densidad_tematica",
        "perturbacion_campo"
      ],
      "relations": [
        "SF_P_0043",
        "SF_P_0058",
        "SF_P_0033"
      ],
      "docRelations": [
        "SF_D_NODE_0059"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0059",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0060",
      "legacy_id": "SF_060",
      "name": "Ecuación Global System Friction",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "La Ecuación Global es la síntesis matemática del sistema. Integra el gradiente de fricción, la latencia social, el ruido cognitivo y la energía relacional en el IHG (Índice Homeostático Global), el indicador de resumen del estado del sistema.",
      "variables": [
        "IHG",
        "GF_promedio",
        "L_social",
        "RC",
        "E_relacional"
      ],
      "equations": [
        "IHG = integral(GF) * (1 + L_social) * (1 + MRC) / E_relacional_total",
        "IHG óptimo  ?^ 0 (homeostasis)",
        "IHG < 0: sistema en desequilibrio hacia alta fricción",
        "Valor actual: IHG = -0.620"
      ],
      "relations": [
        "SF_P_0041",
        "SF_P_0057",
        "SF_P_0058",
        "SF_P_0047",
        "SF_P_0048"
      ],
      "docRelations": [
        "SF_D_NODE_0060"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0060",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "incentivo-contradictorio",
        "compliance-narrativo",
        "umbral-dual"
      ],
      "mihm_v3": {
        "variable": "IHG_global",
        "formula": "IHG=integral(GF)*(1+L_social)*(1+MRC)/E_relacional",
        "weight": 1.0,
        "dimension": "aggregate"
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0061",
      "legacy_id": "SF_061",
      "name": " ndice de Densidad Cognitiva (IDC)",
      "layer": "mathematics",
      "cluster": "SF_CLUSTER_03",
      "description": "El IDC ( ndice de Densidad Cognitiva) mide la relaci n entre la carga de se ales entrantes y la capacidad de procesamiento efectivo del sistema. Un IDC elevado indica que el sistema est  operando cerca o por encima de su capacidad de atenci n sostenible, lo que precede a aumentos en la latencia y el ruido cognitivo.",
      "variables": [
        "IDC",
        "carga_cognitiva_entrante",
        "capacidad_atencional"
      ],
      "equations": [
        "IDC = carga_cognitiva_entrante / capacidad_atencional"
      ],
      "relations": [
        "SF_013",
        "SF_041",
        "SF_046",
        "SF_047"
      ],
      "docRelations": [
        "SF_D_NODE_0061"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0061",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "mathematics",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 2,
        "base_angle": 90,
        "description": "Nodo en anillo tem tico"
      }
    },
    {
      "id": "SF_P_0062",
      "legacy_id": "SF_062",
      "name": "Arquitectura System Friction",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "La Arquitectura System Friction define la organización de todos los componentes técnicos del ecosistema: desde el modelo matemático MIHM hasta el observatorio visual, incluyendo el pipeline PCV y las bases de datos institucionales.",
      "relations": [
        "SF_P_0041",
        "SF_P_0063",
        "SF_P_0080"
      ],
      "docRelations": [
        "SF_D_NODE_0062"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0062",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0063",
      "legacy_id": "SF_063",
      "name": "Pipeline de Procesamiento Cognitivo",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Pipeline de Procesamiento Cognitivo (PCV - Pipeline de Continuidad y Vigilancia) es la implementación técnica del modelo MIHM. Toma datos institucionales como entrada y produce las métricas IHG, ICE, CRM, NTI como salida.",
      "relations": [
        "SF_P_0041",
        "SF_P_0062",
        "SF_P_0064"
      ],
      "docRelations": [
        "SF_D_NODE_0063"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0063",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0064",
      "legacy_id": "SF_064",
      "name": "Motor de Extracción Multimodal",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Extracción Multimodal procesa texto, datos estructurados, series temporales y metadatos para extraer las señales que alimentan el cálculo de métricas MIHM.",
      "relations": [
        "SF_P_0063",
        "SF_P_0065",
        "SF_P_0078"
      ],
      "docRelations": [
        "SF_D_NODE_0064"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0064",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0065",
      "legacy_id": "SF_065",
      "name": "Analizador Semántico",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Analizador Semántico procesa los datos textuales del sistema para calcular la Métrica de Divergencia Semántica (MDS) y el mapa de campo semántico del sistema analizado.",
      "relations": [
        "SF_P_0064",
        "SF_P_0066",
        "SF_P_0049"
      ],
      "docRelations": [
        "SF_D_NODE_0065"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0065",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0066",
      "legacy_id": "SF_066",
      "name": "Analizador Conversacional",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Analizador Conversacional procesa transcripciones, registros y metadatos de conversaciones para detectar patrones de latencia, ruido y divergencia semántica en el sistema de comunicación.",
      "relations": [
        "SF_P_0065",
        "SF_P_0067",
        "SF_P_0100"
      ],
      "docRelations": [
        "SF_D_NODE_0066"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0066",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0067",
      "legacy_id": "SF_067",
      "name": "Motor de Métricas Cognitivas",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Métricas Cognitivas toma las señales extraídas por los analizadores y ejecuta las fórmulas del modelo MIHM para producir los índices IHG, ICE, CRM, NTI, ISC y todas las demás métricas del sistema.",
      "relations": [
        "SF_P_0066",
        "SF_P_0068",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0067"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0067",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0068",
      "legacy_id": "SF_068",
      "name": "Motor de Resonancia",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Resonancia detecta la sincronización emergente entre nodos mediante análisis de correlación de series temporales. Es el componente del pipeline responsable de activar alertas de cascada cuando MR supera el umbral crítico.",
      "variables": [
        "MR",
        "correlacion_nodal",
        "umbral_cascada"
      ],
      "equations": [
        "MR(i,j) = correlacion(serie_i, serie_j) * amplitud_media(i,j)"
      ],
      "relations": [
        "SF_P_0044",
        "SF_P_0067",
        "SF_P_0069"
      ],
      "docRelations": [
        "SF_D_NODE_0068"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0068",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0069",
      "legacy_id": "SF_069",
      "name": "Motor de Fricción",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Fricción implementa la ecuación central FC(i,j) sobre los datos procesados por los analizadores, produciendo el mapa de fricción cognitiva que alimenta el IHG y el observatorio.",
      "variables": [
        "FC",
        "distancia_semantica",
        "latencia_temporal",
        "energia_relacional"
      ],
      "equations": [
        "FC(i,j) = d_sem(i,j) * (1 + λ_t) * N_cognitivo / E_relacional"
      ],
      "relations": [
        "SF_P_0042",
        "SF_P_0068",
        "SF_P_0057"
      ],
      "docRelations": [
        "SF_D_NODE_0069"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0069",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0070",
      "legacy_id": "SF_070",
      "name": "Pipeline de Datos Conversacionales",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Pipeline de Datos Conversacionales es la ruta de procesamiento específica para información de texto y conversación dentro del PCV. Alimenta al Analizador Conversacional y al Analizador Semántico con datos estandarizados.",
      "relations": [
        "SF_P_0063",
        "SF_P_0066",
        "SF_P_0071"
      ],
      "docRelations": [
        "SF_D_NODE_0070"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0070",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0071",
      "legacy_id": "SF_071",
      "name": "Base de Datos Cognitiva",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "La Base de Datos Cognitiva es la capa de persistencia del ecosistema. Almacena las series temporales de métricas, los vectores semánticos, los grafos de interacción y los resultados de simulaciones Monte Carlo para análisis histórico y reproducibilidad.",
      "relations": [
        "SF_P_0070",
        "SF_P_0072",
        "SF_P_0086"
      ],
      "docRelations": [
        "SF_D_NODE_0071"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0071",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0072",
      "legacy_id": "SF_072",
      "name": "API System Friction",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "La API System Friction es el punto de acceso unificado al ecosistema. Permite al observatorio consultar métricas, a los investigadores acceder a datos históricos y a sistemas institucionales integrarse con el pipeline PCV.",
      "relations": [
        "SF_P_0071",
        "SF_P_0073",
        "SF_P_0080"
      ],
      "docRelations": [
        "SF_D_NODE_0072"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0072",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0073",
      "legacy_id": "SF_073",
      "name": "Motor de Inferencia",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Inferencia combina el modelo matemático MIHM con patrones históricos para producir diagnósticos, predicciones y recomendaciones de intervención. Opera bajo el principio de Vigilancia Humana por Diseño: genera recomendaciones, no decisiones.",
      "relations": [
        "SF_P_0072",
        "SF_P_0074",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0073"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0073",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0074",
      "legacy_id": "SF_074",
      "name": "Sistema de Visualización de Grafos",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Visualización de Grafos convierte la estructura matemática del grafo del sistema en una representación visual navegable. Implementa el layout radial multicapa y las propiedades estéticas del ecosistema.",
      "relations": [
        "SF_P_0073",
        "SF_P_0075",
        "SF_P_0092"
      ],
      "docRelations": [
        "SF_D_NODE_0074"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0074",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0075",
      "legacy_id": "SF_075",
      "name": "Sistema de Análisis Temporal",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Análisis Temporal procesa las series históricas de métricas MIHM para identificar patrones de evolución, señales tempranas de cambio de estado y tendencias de largo plazo.",
      "relations": [
        "SF_P_0074",
        "SF_P_0076",
        "SF_P_0099"
      ],
      "docRelations": [
        "SF_D_NODE_0075"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0075",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0076",
      "legacy_id": "SF_076",
      "name": "Motor de Identificación de Patrones",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Identificación de Patrones usa técnicas de análisis de series temporales y aprendizaje no supervisado para detectar patrones conocidos de fricción sistémica en los datos institucionales.",
      "relations": [
        "SF_P_0075",
        "SF_P_0077",
        "SF_P_0089"
      ],
      "docRelations": [
        "SF_D_NODE_0076"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0076",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0077",
      "legacy_id": "SF_077",
      "name": "Motor de Clasificación Conversacional",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Clasificación Conversacional categoriza cada intercambio del sistema en tipos de conversación (acuerdo, conflicto, escalación, confirmación vacía) y estados (en resolución, en atractor disfuncional, en deuda de decisión).",
      "relations": [
        "SF_P_0076",
        "SF_P_0078",
        "SF_P_0033"
      ],
      "docRelations": [
        "SF_D_NODE_0077"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0077",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0078",
      "legacy_id": "SF_078",
      "name": "Sistema de Captura Multicanal",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Captura Multicanal es la puerta de entrada de datos al pipeline PCV. Conecta con los diferentes canales de comunicación institucional para recopilar señales en tiempo real o en diferido.",
      "relations": [
        "SF_P_0077",
        "SF_P_0079",
        "SF_P_0064"
      ],
      "docRelations": [
        "SF_D_NODE_0078"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0078",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0079",
      "legacy_id": "SF_079",
      "name": "Motor de Modelado Cognitivo",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Modelado Cognitivo traduce los datos crudos de cada nodo institucional en representaciones vectoriales y campos cognitivos que alimentan los cálculos del modelo MIHM.",
      "relations": [
        "SF_P_0078",
        "SF_P_0080",
        "SF_P_0043"
      ],
      "docRelations": [
        "SF_D_NODE_0079"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0079",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0080",
      "legacy_id": "SF_080",
      "name": "Plataforma Observatorio",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "La Plataforma Observatorio es la capa tecnológica que integra todos los componentes del pipeline en una interfaz visual interactiva para el operador. Implementa el SF Observatory 2.5 sobre el stack técnico del ecosistema.",
      "relations": [
        "SF_P_0079",
        "SF_P_0081",
        "SF_P_0092",
        "SF_P_0062"
      ],
      "docRelations": [
        "SF_D_NODE_0080"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0080",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0081",
      "legacy_id": "SF_081",
      "name": "Sistema de Monitoreo de Interacciones",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Monitoreo de Interacciones observa de forma continua cómo los nodos del sistema se relacionan entre sí, detectando cambios en frecuencia, calidad y patrón de sus intercambios.",
      "relations": [
        "SF_P_0080",
        "SF_P_0082",
        "SF_P_0006"
      ],
      "docRelations": [
        "SF_D_NODE_0081"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0081",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0082",
      "legacy_id": "SF_082",
      "name": "Motor de Simulación Social",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Simulación Social implementa la simulación Monte Carlo del ecosistema. Con 50,000 iteraciones por sesión, genera la distribución de estados futuros posibles del sistema dado el estado actual.",
      "variables": [
        "iteraciones",
        "seed",
        "distribucion_estados"
      ],
      "equations": [
        "Monte Carlo: N=50000",
        "seed=42"
      ],
      "relations": [
        "SF_P_0081",
        "SF_P_0083",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0082"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0082",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0083",
      "legacy_id": "SF_083",
      "name": "Pipeline Analítico",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Pipeline Analítico es la orquestación de todos los componentes de análisis: define el orden de ejecución, gestiona las dependencias entre componentes y produce el output integrado para el observatorio.",
      "relations": [
        "SF_P_0082",
        "SF_P_0084",
        "SF_P_0063"
      ],
      "docRelations": [
        "SF_D_NODE_0083"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0083",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0084",
      "legacy_id": "SF_084",
      "name": "Sistema de Visualización 3D",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Visualización 3D es la implementación del modo cosmológico del observatorio: los nodos como cuerpos celestes, las relaciones como campos gravitacionales, la fricción como perturbaciones del espacio-tiempo del sistema.",
      "relations": [
        "SF_P_0083",
        "SF_P_0085",
        "SF_P_0074"
      ],
      "docRelations": [
        "SF_D_NODE_0084"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0084",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0085",
      "legacy_id": "SF_085",
      "name": "Plataforma de Investigación",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "La Plataforma de Investigación (SF Lab) es el entorno beta para investigadores avanzados del sistema. Provee acceso a funcionalidades extendidas del pipeline, herramientas de exploración de datos y capacidades de experimentación con el modelo.",
      "relations": [
        "SF_P_0084",
        "SF_P_0086",
        "SF_P_0116"
      ],
      "docRelations": [
        "SF_D_NODE_0085"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0085",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0086",
      "legacy_id": "SF_086",
      "name": "Sistema de Datos Cognitivos",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Datos Cognitivos gestiona específicamente las representaciones computacionales de los modelos cognitivos del sistema: vectores, campos y grafos que no encajan en el modelo relacional estándar de la Base de Datos Cognitiva.",
      "relations": [
        "SF_P_0085",
        "SF_P_0087",
        "SF_P_0071"
      ],
      "docRelations": [
        "SF_D_NODE_0086"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0086",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0087",
      "legacy_id": "SF_087",
      "name": "Motor de Grafos Cognitivos",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Grafos Cognitivos implementa los algoritmos de teoría de grafos necesarios para analizar la topología del sistema: centralidad, caminos críticos, detección de comunidades y vulnerabilidades estructurales.",
      "relations": [
        "SF_P_0086",
        "SF_P_0088",
        "SF_P_0025"
      ],
      "docRelations": [
        "SF_D_NODE_0087"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0087",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0088",
      "legacy_id": "SF_088",
      "name": "Sistema de Exploración de Datos",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Sistema de Exploración de Datos provee una interfaz de consulta flexible que permite a investigadores y operadores explorar los datos del ecosistema más allá de los análisis pre-definidos del pipeline.",
      "relations": [
        "SF_P_0087",
        "SF_P_0089",
        "SF_P_0093"
      ],
      "docRelations": [
        "SF_D_NODE_0088"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0088",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0089",
      "legacy_id": "SF_089",
      "name": "Motor de Aprendizaje Adaptativo",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Motor de Aprendizaje Adaptativo implementa el ciclo de aprendizaje del ecosistema: compara las predicciones del modelo con los estados efectivamente observados y ajusta los parámetros para reducir el error sistemático.",
      "relations": [
        "SF_P_0088",
        "SF_P_0090",
        "SF_P_0076"
      ],
      "docRelations": [
        "SF_D_NODE_0089"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0089",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0090",
      "legacy_id": "SF_090",
      "name": "Infraestructura de Observación",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "La Infraestructura de Observación es la capa de hosting y operaciones que sostiene todo el ecosistema tecnológico. Aplica el mismo principio de vigilancia que el sistema monitorea: la infraestructura también se observa a sí misma.",
      "relations": [
        "SF_P_0089",
        "SF_P_0091",
        "SF_P_0080"
      ],
      "docRelations": [
        "SF_D_NODE_0090"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0090",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0091",
      "legacy_id": "SF_091",
      "name": "Núcleo Computacional System Friction",
      "layer": "technology",
      "cluster": "SF_CLUSTER_04",
      "description": "El Núcleo Computacional System Friction es la síntesis tecnológica del ecosistema. Integra todos los componentes del pipeline, el observatorio y la infraestructura en un sistema de software cohesivo. Estado actual: MIHM Core 2.0 sobre SF Observatory 2.5.",
      "relations": [
        "SF_P_0090",
        "SF_P_0062",
        "SF_P_0041",
        "SF_P_0092"
      ],
      "docRelations": [
        "SF_D_NODE_0091"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0091",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada",
        "coherencia-aparente"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "technology",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 3,
        "base_angle": 135,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0092",
      "legacy_id": "SF_092",
      "name": "Observatorio System Friction",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Observatorio System Friction es la interfaz principal del ecosistema. Integra el mapa cognitivo de 120 nodos, los paneles de métricas MIHM, las herramientas de análisis y el sistema de alertas en una plataforma de observación institucional.",
      "relations": [
        "SF_P_0091",
        "SF_P_0080",
        "SF_P_0093",
        "SF_P_0001"
      ],
      "docRelations": [
        "SF_D_NODE_0092"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0092",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0093",
      "legacy_id": "SF_093",
      "name": "Mapa Cognitivo Global",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Mapa Cognitivo Global es la representación central del observatorio. Muestra los 120 nodos del sistema en layout radial de 4 anillos, con codificación visual de estado y fricción en tiempo real.",
      "relations": [
        "SF_P_0092",
        "SF_P_0094",
        "SF_P_0074"
      ],
      "docRelations": [
        "SF_D_NODE_0093"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0093",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0094",
      "legacy_id": "SF_094",
      "name": "Visualizador de Nodos",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Visualizador de Nodos es el panel de detalle que se activa al seleccionar un nodo en el Mapa Cognitivo Global. Muestra la ficha estructurada del nodo con toda su información conceptual y sus métricas actuales.",
      "relations": [
        "SF_P_0093",
        "SF_P_0095",
        "SF_P_0096"
      ],
      "docRelations": [
        "SF_D_NODE_0094"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0094",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0095",
      "legacy_id": "SF_095",
      "name": "Explorador de Relaciones",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Explorador de Relaciones es la herramienta de análisis de conectividad del observatorio. Permite filtrar, visualizar y analizar las relaciones del grafo según tipo, intensidad y estado.",
      "relations": [
        "SF_P_0094",
        "SF_P_0096",
        "SF_P_0087"
      ],
      "docRelations": [
        "SF_D_NODE_0095"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0095",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0096",
      "legacy_id": "SF_096",
      "name": "Panel de Métricas",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Panel de Métricas es el dashboard principal del observatorio SF. Muestra los valores actuales de IHG, ICE, CRM, NTI, ISC, ICC y los demás índices MIHM con su interpretación y tendencia.",
      "relations": [
        "SF_P_0095",
        "SF_P_0097",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0096"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0096",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0097",
      "legacy_id": "SF_097",
      "name": "Panel de Resonancia",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Panel de Resonancia muestra el mapa de correlaciones entre nodos del sistema, identificando las zonas de alta sincronización y el riesgo de cascada disfuncional.",
      "relations": [
        "SF_P_0096",
        "SF_P_0098",
        "SF_P_0044"
      ],
      "docRelations": [
        "SF_D_NODE_0097"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0097",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0098",
      "legacy_id": "SF_098",
      "name": "Panel de Fricción",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Panel de Fricción es la interfaz visual del Motor de Fricción. Muestra el mapa de gradiente de fricción, los puntos de acumulación críticos y la evolución temporal de la fricción sistémica.",
      "relations": [
        "SF_P_0097",
        "SF_P_0099",
        "SF_P_0057"
      ],
      "docRelations": [
        "SF_D_NODE_0098"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0098",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0099",
      "legacy_id": "SF_099",
      "name": "Mapa Temporal de Interacciones",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Mapa Temporal de Interacciones convierte las series temporales de datos relacionales en una visualización navegable que permite recorrer la historia del sistema y identificar momentos de cambio crítico.",
      "relations": [
        "SF_P_0098",
        "SF_P_0100",
        "SF_P_0075"
      ],
      "docRelations": [
        "SF_D_NODE_0099"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0099",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0100",
      "legacy_id": "SF_100",
      "name": "Analizador de Conversaciones",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Analizador de Conversaciones (panel del observatorio) presenta de forma visual los resultados del Analizador Conversacional del pipeline: patrones detectados, atractores del sistema y métricas de coherencia.",
      "relations": [
        "SF_P_0099",
        "SF_P_0101",
        "SF_P_0066"
      ],
      "docRelations": [
        "SF_D_NODE_0100"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0100",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0101",
      "legacy_id": "SF_101",
      "name": "Panel de Sincronización Cognitiva",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Panel de Sincronización Cognitiva muestra el ISC del sistema y su descomposición en sus componentes temporal y semántico, permitiendo identificar si la desincronización es temporal o semántica.",
      "relations": [
        "SF_P_0100",
        "SF_P_0102",
        "SF_P_0051"
      ],
      "docRelations": [
        "SF_D_NODE_0101"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0101",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0102",
      "legacy_id": "SF_102",
      "name": "Visualizador de Campos Semánticos",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Visualizador de Campos Semánticos renderiza el modelo de campo semántico como una topografía visual: zonas de alta densidad (términos bien definidos), gradientes (fronteras semánticas) y vacíos (conceptos faltantes).",
      "relations": [
        "SF_P_0101",
        "SF_P_0103",
        "SF_P_0043"
      ],
      "docRelations": [
        "SF_D_NODE_0102"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0102",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0103",
      "legacy_id": "SF_103",
      "name": "Motor de Navegación Cognitiva",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Motor de Navegación Cognitiva es la guía inteligente del observatorio. Sugiere qué nodos explorar, qué relaciones investigar y qué secuencia de análisis seguir para obtener el diagnóstico más informativo del estado del sistema.",
      "relations": [
        "SF_P_0102",
        "SF_P_0104",
        "SF_P_0073"
      ],
      "docRelations": [
        "SF_D_NODE_0103"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0103",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0104",
      "legacy_id": "SF_104",
      "name": "Panel de Densidad Relacional",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Panel de Densidad Relacional muestra la distribución de MDI en el grafo del sistema: qué nodos están en zona óptima, cuáles están sobrecargados y cuáles están aislados.",
      "relations": [
        "SF_P_0103",
        "SF_P_0105",
        "SF_P_0054"
      ],
      "docRelations": [
        "SF_D_NODE_0104"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0104",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0105",
      "legacy_id": "SF_105",
      "name": "Mapa de Gradientes Cognitivos",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Mapa de Gradientes Cognitivos es la representación visual del campo de vectores del gradiente de fricción: muestra la dirección y magnitud del gradiente en cada punto del sistema, identificando dónde fluye la fricción.",
      "relations": [
        "SF_P_0104",
        "SF_P_0106",
        "SF_P_0057"
      ],
      "docRelations": [
        "SF_D_NODE_0105"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0105",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0106",
      "legacy_id": "SF_106",
      "name": "Explorador de Clústeres",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_05",
      "description": "El Explorador de Clústeres permite analizar el sistema a nivel de clúster: el estado agregado de cada grupo de nodos, las relaciones entre clústeres y la detección de comunidades emergentes.",
      "relations": [
        "SF_P_0105",
        "SF_P_0107",
        "SF_P_0025"
      ],
      "docRelations": [
        "SF_D_NODE_0106"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0106",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 180,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0107",
      "legacy_id": "SF_107",
      "name": "Mapa de Sistemas Sociales",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Mapa de Sistemas Sociales complementa el Mapa Cognitivo Global con información sobre la estructura social del sistema: quién ocupa qué posición, qué roles tienen, cómo se distribuye el poder estructural.",
      "relations": [
        "SF_P_0106",
        "SF_P_0108",
        "SF_P_0025"
      ],
      "docRelations": [
        "SF_D_NODE_0107"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0107",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0108",
      "legacy_id": "SF_108",
      "name": "Panel de Ruido Cognitivo",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Panel de Ruido Cognitivo muestra la MRC del sistema, las principales fuentes de ruido identificadas y su impacto sobre la capacidad de procesamiento institucional.",
      "relations": [
        "SF_P_0107",
        "SF_P_0109",
        "SF_P_0047"
      ],
      "docRelations": [
        "SF_D_NODE_0108"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0108",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0109",
      "legacy_id": "SF_109",
      "name": "Panel de Coherencia Conversacional",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Panel de Coherencia Conversacional visualiza el ICC del sistema, la distribución de coherencia entre nodos y los patrones de conversación que contribuyen positiva o negativamente a la coherencia.",
      "relations": [
        "SF_P_0108",
        "SF_P_0110",
        "SF_P_0045"
      ],
      "docRelations": [
        "SF_D_NODE_0109"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0109",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0110",
      "legacy_id": "SF_110",
      "name": "Panel de Energía Relacional",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Panel de Energía Relacional muestra el estado del balance energético de las relaciones del sistema: qué vínculos tienen alta energía disponible, cuáles están en deuda energética y cuáles en riesgo de AMT.",
      "relations": [
        "SF_P_0109",
        "SF_P_0111",
        "SF_P_0048"
      ],
      "docRelations": [
        "SF_D_NODE_0110"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0110",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0111",
      "legacy_id": "SF_111",
      "name": "Mapa de Interacciones Humanas",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Mapa de Interacciones Humanas es la capa del observatorio más cercana a los datos empíricos: muestra los patrones reales de interacción entre agentes con la mayor resolución disponible.",
      "relations": [
        "SF_P_0110",
        "SF_P_0112",
        "SF_P_0004"
      ],
      "docRelations": [
        "SF_D_NODE_0111"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0111",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0112",
      "legacy_id": "SF_112",
      "name": "Visualizador Multinivel",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Visualizador Multinivel implementa la navegación multi-escala del observatorio: el operador puede moverse fluidamente entre la vista del sistema completo, la vista de clúster, la vista de nodo y la vista de vínculo.",
      "relations": [
        "SF_P_0111",
        "SF_P_0113",
        "SF_P_0094"
      ],
      "docRelations": [
        "SF_D_NODE_0112"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0112",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0113",
      "legacy_id": "SF_113",
      "name": "Explorador de Campos Cognitivos",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_06",
      "description": "El Explorador de Campos Cognitivos permite al operador visualizar, comparar y analizar los modelos de campo cognitivo de los nodos del sistema, identificando similitudes, diferencias y zonas de potencial conflicto semántico.",
      "relations": [
        "SF_P_0112",
        "SF_P_0114",
        "SF_P_0043"
      ],
      "docRelations": [
        "SF_D_NODE_0113"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0113",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 225,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0114",
      "legacy_id": "SF_114",
      "name": "Panel de Divergencia Semántica",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_07",
      "description": "El Panel de Divergencia Semántica muestra el mapa de MDS del sistema, identificando los pares de nodos con mayor divergencia semántica y las tendencias de convergencia o divergencia.",
      "relations": [
        "SF_P_0113",
        "SF_P_0115",
        "SF_P_0049"
      ],
      "docRelations": [
        "SF_D_NODE_0114"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0114",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 270,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0115",
      "legacy_id": "SF_115",
      "name": "Mapa de Resonancia Social",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_07",
      "description": "El Mapa de Resonancia Social combina la MR con el análisis de campo social para mostrar dónde hay resonancias activas, qué patrones se están amplificando y qué zonas del sistema tienen riesgo de sincronización disfuncional.",
      "relations": [
        "SF_P_0114",
        "SF_P_0116",
        "SF_P_0029"
      ],
      "docRelations": [
        "SF_D_NODE_0115"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0115",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 270,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0116",
      "legacy_id": "SF_116",
      "name": "Panel de Equilibrio Sistémico",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_07",
      "description": "El Panel de Equilibrio Sistémico es la vista de más alto nivel del observatorio: muestra el IES del sistema, su posición en el espacio de estados y la trayectoria proyectada.",
      "relations": [
        "SF_P_0115",
        "SF_P_0117",
        "SF_P_0056"
      ],
      "docRelations": [
        "SF_D_NODE_0116"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0116",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 270,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0117",
      "legacy_id": "SF_117",
      "name": "Mapa de Latencia Conversacional",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_07",
      "description": "El Mapa de Latencia Conversacional muestra la distribución de LC y LDI en el grafo del sistema: qué vínculos tienen alta latencia, dónde están los cuellos de botella y cuáles están acercándose al umbral de invalidity de señal.",
      "relations": [
        "SF_P_0116",
        "SF_P_0118",
        "SF_P_0046"
      ],
      "docRelations": [
        "SF_D_NODE_0117"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0117",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 270,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0118",
      "legacy_id": "SF_118",
      "name": "Panel de Perturbación Cognitiva",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_08",
      "description": "El Panel de Perturbación Cognitiva muestra en tiempo real las perturbaciones detectadas en el sistema: su origen, intensidad, patrón de propagación y distancia al umbral crítico.",
      "relations": [
        "SF_P_0117",
        "SF_P_0119",
        "SF_P_0036"
      ],
      "docRelations": [
        "SF_D_NODE_0118"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0118",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 315,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0119",
      "legacy_id": "SF_119",
      "name": "Mapa de Transferencia Semántica",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_08",
      "description": "El Mapa de Transferencia Semántica muestra cómo fluye el significado a través del sistema institucional: qué rutas tiene, dónde pierde fidelidad y cuáles son los mecanismos de alta y baja fidelidad activos.",
      "relations": [
        "SF_P_0118",
        "SF_P_0120",
        "SF_P_0050"
      ],
      "docRelations": [
        "SF_D_NODE_0119"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0119",
          "source": "SF_docs_supplement_v3.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 315,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0120",
      "legacy_id": "SF_120",
      "name": "Panel de Estabilidad Relacional",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_08",
      "description": "El Panel de Estabilidad Relacional es la herramienta de gestión de vínculos del observatorio. Muestra el E_estabilidad de cada vínculo y predice qué vínculos fallarán primero ante una perturbación.",
      "relations": [
        "SF_P_0119",
        "SF_P_0121",
        "SF_P_0055"
      ],
      "docRelations": [
        "SF_D_NODE_0120"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0120",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 315,
        "description": "Nodo en anillo temático"
      }
    },
    {
      "id": "SF_P_0121",
      "legacy_id": "SF_121",
      "name": "Visualizador del Sistema Completo",
      "layer": "observatory",
      "cluster": "SF_CLUSTER_08",
      "description": "El Visualizador del Sistema Completo es la pantalla de resumen ejecutivo del observatorio. Integra todos los indicadores clave en una sola vista: el mapa cognitivo, las métricas principales, las alertas activas y la trayectoria del sistema.",
      "relations": [
        "SF_P_0120",
        "SF_P_0092",
        "SF_P_0001",
        "SF_P_0041"
      ],
      "docRelations": [
        "SF_D_NODE_0121"
      ],
      "docRefs": [
        {
          "doc_id": "SF_D_NODE_0121",
          "source": "SF_docs.js"
        }
      ],
      "patterns": [
        "alerta-ignorada"
      ],
      "mihm_v3": {
        "variable": "derived",
        "dimension": "observatory",
        "contributes_to": "IHG via pipeline",
        "weight": 0.0
      },
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0,
        "ring": 4,
        "base_angle": 315,
        "description": "Nodo en anillo temático"
      }
    }
  ],
  "edges": [
    {
      "source": "SF_P_0001",
      "target": "SF_P_0002"
    },
    {
      "source": "SF_P_0001",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0001",
      "target": "SF_P_0010"
    },
    {
      "source": "SF_P_0001",
      "target": "SF_P_0021"
    },
    {
      "source": "SF_P_0001",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0002",
      "target": "SF_P_0001"
    },
    {
      "source": "SF_P_0002",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0002",
      "target": "SF_P_0004"
    },
    {
      "source": "SF_P_0002",
      "target": "SF_P_0021"
    },
    {
      "source": "SF_P_0003",
      "target": "SF_P_0001"
    },
    {
      "source": "SF_P_0003",
      "target": "SF_P_0004"
    },
    {
      "source": "SF_P_0003",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0003",
      "target": "SF_P_0042"
    },
    {
      "source": "SF_P_0004",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0004",
      "target": "SF_P_0005"
    },
    {
      "source": "SF_P_0004",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0005",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0005",
      "target": "SF_P_0006"
    },
    {
      "source": "SF_P_0005",
      "target": "SF_P_0044"
    },
    {
      "source": "SF_P_0006",
      "target": "SF_P_0005"
    },
    {
      "source": "SF_P_0006",
      "target": "SF_P_0007"
    },
    {
      "source": "SF_P_0006",
      "target": "SF_P_0046"
    },
    {
      "source": "SF_P_0007",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0007",
      "target": "SF_P_0008"
    },
    {
      "source": "SF_P_0007",
      "target": "SF_P_0057"
    },
    {
      "source": "SF_P_0008",
      "target": "SF_P_0007"
    },
    {
      "source": "SF_P_0008",
      "target": "SF_P_0009"
    },
    {
      "source": "SF_P_0008",
      "target": "SF_P_0031"
    },
    {
      "source": "SF_P_0009",
      "target": "SF_P_0008"
    },
    {
      "source": "SF_P_0009",
      "target": "SF_P_0010"
    },
    {
      "source": "SF_P_0009",
      "target": "SF_P_0030"
    },
    {
      "source": "SF_P_0010",
      "target": "SF_P_0009"
    },
    {
      "source": "SF_P_0010",
      "target": "SF_P_0011"
    },
    {
      "source": "SF_P_0010",
      "target": "SF_P_0044"
    },
    {
      "source": "SF_P_0011",
      "target": "SF_P_0010"
    },
    {
      "source": "SF_P_0011",
      "target": "SF_P_0012"
    },
    {
      "source": "SF_P_0011",
      "target": "SF_P_0032"
    },
    {
      "source": "SF_P_0012",
      "target": "SF_P_0010"
    },
    {
      "source": "SF_P_0012",
      "target": "SF_P_0011"
    },
    {
      "source": "SF_P_0012",
      "target": "SF_P_0034"
    },
    {
      "source": "SF_P_0013",
      "target": "SF_P_0012"
    },
    {
      "source": "SF_P_0013",
      "target": "SF_P_0014"
    },
    {
      "source": "SF_P_0013",
      "target": "SF_P_0047"
    },
    {
      "source": "SF_P_0013",
      "target": "SF_P_0061"
    },
    {
      "source": "SF_P_0014",
      "target": "SF_P_0013"
    },
    {
      "source": "SF_P_0014",
      "target": "SF_P_0015"
    },
    {
      "source": "SF_P_0014",
      "target": "SF_P_0046"
    },
    {
      "source": "SF_P_0015",
      "target": "SF_P_0010"
    },
    {
      "source": "SF_P_0015",
      "target": "SF_P_0014"
    },
    {
      "source": "SF_P_0015",
      "target": "SF_P_0049"
    },
    {
      "source": "SF_P_0016",
      "target": "SF_P_0009"
    },
    {
      "source": "SF_P_0016",
      "target": "SF_P_0015"
    },
    {
      "source": "SF_P_0016",
      "target": "SF_P_0051"
    },
    {
      "source": "SF_P_0017",
      "target": "SF_P_0016"
    },
    {
      "source": "SF_P_0017",
      "target": "SF_P_0018"
    },
    {
      "source": "SF_P_0017",
      "target": "SF_P_0026"
    },
    {
      "source": "SF_P_0018",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0018",
      "target": "SF_P_0019"
    },
    {
      "source": "SF_P_0018",
      "target": "SF_P_0052"
    },
    {
      "source": "SF_P_0019",
      "target": "SF_P_0009"
    },
    {
      "source": "SF_P_0019",
      "target": "SF_P_0018"
    },
    {
      "source": "SF_P_0019",
      "target": "SF_P_0050"
    },
    {
      "source": "SF_P_0020",
      "target": "SF_P_0005"
    },
    {
      "source": "SF_P_0020",
      "target": "SF_P_0019"
    },
    {
      "source": "SF_P_0020",
      "target": "SF_P_0037"
    },
    {
      "source": "SF_P_0020",
      "target": "SF_P_0055"
    },
    {
      "source": "SF_P_0021",
      "target": "SF_P_0001"
    },
    {
      "source": "SF_P_0021",
      "target": "SF_P_0022"
    },
    {
      "source": "SF_P_0021",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0022",
      "target": "SF_P_0021"
    },
    {
      "source": "SF_P_0022",
      "target": "SF_P_0023"
    },
    {
      "source": "SF_P_0022",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0023",
      "target": "SF_P_0022"
    },
    {
      "source": "SF_P_0023",
      "target": "SF_P_0024"
    },
    {
      "source": "SF_P_0023",
      "target": "SF_P_0033"
    },
    {
      "source": "SF_P_0024",
      "target": "SF_P_0005"
    },
    {
      "source": "SF_P_0024",
      "target": "SF_P_0023"
    },
    {
      "source": "SF_P_0024",
      "target": "SF_P_0048"
    },
    {
      "source": "SF_P_0025",
      "target": "SF_P_0024"
    },
    {
      "source": "SF_P_0025",
      "target": "SF_P_0026"
    },
    {
      "source": "SF_P_0025",
      "target": "SF_P_0063"
    },
    {
      "source": "SF_P_0026",
      "target": "SF_P_0017"
    },
    {
      "source": "SF_P_0026",
      "target": "SF_P_0025"
    },
    {
      "source": "SF_P_0026",
      "target": "SF_P_0035"
    },
    {
      "source": "SF_P_0027",
      "target": "SF_P_0013"
    },
    {
      "source": "SF_P_0027",
      "target": "SF_P_0026"
    },
    {
      "source": "SF_P_0027",
      "target": "SF_P_0058"
    },
    {
      "source": "SF_P_0028",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0028",
      "target": "SF_P_0021"
    },
    {
      "source": "SF_P_0028",
      "target": "SF_P_0036"
    },
    {
      "source": "SF_P_0029",
      "target": "SF_P_0010"
    },
    {
      "source": "SF_P_0029",
      "target": "SF_P_0028"
    },
    {
      "source": "SF_P_0029",
      "target": "SF_P_0044"
    },
    {
      "source": "SF_P_0030",
      "target": "SF_P_0009"
    },
    {
      "source": "SF_P_0030",
      "target": "SF_P_0029"
    },
    {
      "source": "SF_P_0030",
      "target": "SF_P_0046"
    },
    {
      "source": "SF_P_0031",
      "target": "SF_P_0008"
    },
    {
      "source": "SF_P_0031",
      "target": "SF_P_0030"
    },
    {
      "source": "SF_P_0031",
      "target": "SF_P_0032"
    },
    {
      "source": "SF_P_0032",
      "target": "SF_P_0011"
    },
    {
      "source": "SF_P_0032",
      "target": "SF_P_0031"
    },
    {
      "source": "SF_P_0032",
      "target": "SF_P_0036"
    },
    {
      "source": "SF_P_0033",
      "target": "SF_P_0023"
    },
    {
      "source": "SF_P_0033",
      "target": "SF_P_0032"
    },
    {
      "source": "SF_P_0033",
      "target": "SF_P_0066"
    },
    {
      "source": "SF_P_0034",
      "target": "SF_P_0012"
    },
    {
      "source": "SF_P_0034",
      "target": "SF_P_0033"
    },
    {
      "source": "SF_P_0034",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0035",
      "target": "SF_P_0026"
    },
    {
      "source": "SF_P_0035",
      "target": "SF_P_0034"
    },
    {
      "source": "SF_P_0035",
      "target": "SF_P_0062"
    },
    {
      "source": "SF_P_0036",
      "target": "SF_P_0028"
    },
    {
      "source": "SF_P_0036",
      "target": "SF_P_0035"
    },
    {
      "source": "SF_P_0036",
      "target": "SF_P_0053"
    },
    {
      "source": "SF_P_0037",
      "target": "SF_P_0020"
    },
    {
      "source": "SF_P_0037",
      "target": "SF_P_0036"
    },
    {
      "source": "SF_P_0037",
      "target": "SF_P_0055"
    },
    {
      "source": "SF_P_0038",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0038",
      "target": "SF_P_0037"
    },
    {
      "source": "SF_P_0038",
      "target": "SF_P_0060"
    },
    {
      "source": "SF_P_0039",
      "target": "SF_P_0012"
    },
    {
      "source": "SF_P_0039",
      "target": "SF_P_0038"
    },
    {
      "source": "SF_P_0039",
      "target": "SF_P_0050"
    },
    {
      "source": "SF_P_0040",
      "target": "SF_P_0021"
    },
    {
      "source": "SF_P_0040",
      "target": "SF_P_0039"
    },
    {
      "source": "SF_P_0040",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0041",
      "target": "SF_P_0001"
    },
    {
      "source": "SF_P_0041",
      "target": "SF_P_0040"
    },
    {
      "source": "SF_P_0041",
      "target": "SF_P_0042"
    },
    {
      "source": "SF_P_0041",
      "target": "SF_P_0062"
    },
    {
      "source": "SF_P_0041",
      "target": "SF_P_0061"
    },
    {
      "source": "SF_P_0042",
      "target": "SF_P_0003"
    },
    {
      "source": "SF_P_0042",
      "target": "SF_P_0035"
    },
    {
      "source": "SF_P_0042",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0042",
      "target": "SF_P_0069"
    },
    {
      "source": "SF_P_0043",
      "target": "SF_P_0034"
    },
    {
      "source": "SF_P_0043",
      "target": "SF_P_0042"
    },
    {
      "source": "SF_P_0043",
      "target": "SF_P_0059"
    },
    {
      "source": "SF_P_0044",
      "target": "SF_P_0029"
    },
    {
      "source": "SF_P_0044",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0044",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0045",
      "target": "SF_P_0008"
    },
    {
      "source": "SF_P_0045",
      "target": "SF_P_0044"
    },
    {
      "source": "SF_P_0045",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0046",
      "target": "SF_P_0014"
    },
    {
      "source": "SF_P_0046",
      "target": "SF_P_0045"
    },
    {
      "source": "SF_P_0046",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0046",
      "target": "SF_P_0061"
    },
    {
      "source": "SF_P_0047",
      "target": "SF_P_0013"
    },
    {
      "source": "SF_P_0047",
      "target": "SF_P_0046"
    },
    {
      "source": "SF_P_0047",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0047",
      "target": "SF_P_0061"
    },
    {
      "source": "SF_P_0048",
      "target": "SF_P_0024"
    },
    {
      "source": "SF_P_0048",
      "target": "SF_P_0047"
    },
    {
      "source": "SF_P_0048",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0049",
      "target": "SF_P_0015"
    },
    {
      "source": "SF_P_0049",
      "target": "SF_P_0048"
    },
    {
      "source": "SF_P_0049",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0050",
      "target": "SF_P_0039"
    },
    {
      "source": "SF_P_0050",
      "target": "SF_P_0049"
    },
    {
      "source": "SF_P_0050",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0051",
      "target": "SF_P_0016"
    },
    {
      "source": "SF_P_0051",
      "target": "SF_P_0050"
    },
    {
      "source": "SF_P_0051",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0052",
      "target": "SF_P_0018"
    },
    {
      "source": "SF_P_0052",
      "target": "SF_P_0051"
    },
    {
      "source": "SF_P_0052",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0053",
      "target": "SF_P_0036"
    },
    {
      "source": "SF_P_0053",
      "target": "SF_P_0052"
    },
    {
      "source": "SF_P_0053",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0054",
      "target": "SF_P_0006"
    },
    {
      "source": "SF_P_0054",
      "target": "SF_P_0053"
    },
    {
      "source": "SF_P_0054",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0055",
      "target": "SF_P_0020"
    },
    {
      "source": "SF_P_0055",
      "target": "SF_P_0054"
    },
    {
      "source": "SF_P_0055",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0056",
      "target": "SF_P_0037"
    },
    {
      "source": "SF_P_0056",
      "target": "SF_P_0055"
    },
    {
      "source": "SF_P_0056",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0057",
      "target": "SF_P_0007"
    },
    {
      "source": "SF_P_0057",
      "target": "SF_P_0056"
    },
    {
      "source": "SF_P_0057",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0058",
      "target": "SF_P_0027"
    },
    {
      "source": "SF_P_0058",
      "target": "SF_P_0057"
    },
    {
      "source": "SF_P_0058",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0059",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0059",
      "target": "SF_P_0058"
    },
    {
      "source": "SF_P_0059",
      "target": "SF_P_0033"
    },
    {
      "source": "SF_P_0060",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0060",
      "target": "SF_P_0057"
    },
    {
      "source": "SF_P_0060",
      "target": "SF_P_0058"
    },
    {
      "source": "SF_P_0060",
      "target": "SF_P_0047"
    },
    {
      "source": "SF_P_0060",
      "target": "SF_P_0048"
    },
    {
      "source": "SF_P_0062",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0062",
      "target": "SF_P_0063"
    },
    {
      "source": "SF_P_0062",
      "target": "SF_P_0080"
    },
    {
      "source": "SF_P_0063",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0063",
      "target": "SF_P_0062"
    },
    {
      "source": "SF_P_0063",
      "target": "SF_P_0064"
    },
    {
      "source": "SF_P_0064",
      "target": "SF_P_0063"
    },
    {
      "source": "SF_P_0064",
      "target": "SF_P_0065"
    },
    {
      "source": "SF_P_0064",
      "target": "SF_P_0078"
    },
    {
      "source": "SF_P_0065",
      "target": "SF_P_0064"
    },
    {
      "source": "SF_P_0065",
      "target": "SF_P_0066"
    },
    {
      "source": "SF_P_0065",
      "target": "SF_P_0049"
    },
    {
      "source": "SF_P_0066",
      "target": "SF_P_0065"
    },
    {
      "source": "SF_P_0066",
      "target": "SF_P_0067"
    },
    {
      "source": "SF_P_0066",
      "target": "SF_P_0100"
    },
    {
      "source": "SF_P_0067",
      "target": "SF_P_0066"
    },
    {
      "source": "SF_P_0067",
      "target": "SF_P_0068"
    },
    {
      "source": "SF_P_0067",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0068",
      "target": "SF_P_0044"
    },
    {
      "source": "SF_P_0068",
      "target": "SF_P_0067"
    },
    {
      "source": "SF_P_0068",
      "target": "SF_P_0069"
    },
    {
      "source": "SF_P_0069",
      "target": "SF_P_0042"
    },
    {
      "source": "SF_P_0069",
      "target": "SF_P_0068"
    },
    {
      "source": "SF_P_0069",
      "target": "SF_P_0057"
    },
    {
      "source": "SF_P_0070",
      "target": "SF_P_0063"
    },
    {
      "source": "SF_P_0070",
      "target": "SF_P_0066"
    },
    {
      "source": "SF_P_0070",
      "target": "SF_P_0071"
    },
    {
      "source": "SF_P_0071",
      "target": "SF_P_0070"
    },
    {
      "source": "SF_P_0071",
      "target": "SF_P_0072"
    },
    {
      "source": "SF_P_0071",
      "target": "SF_P_0086"
    },
    {
      "source": "SF_P_0072",
      "target": "SF_P_0071"
    },
    {
      "source": "SF_P_0072",
      "target": "SF_P_0073"
    },
    {
      "source": "SF_P_0072",
      "target": "SF_P_0080"
    },
    {
      "source": "SF_P_0073",
      "target": "SF_P_0072"
    },
    {
      "source": "SF_P_0073",
      "target": "SF_P_0074"
    },
    {
      "source": "SF_P_0073",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0074",
      "target": "SF_P_0073"
    },
    {
      "source": "SF_P_0074",
      "target": "SF_P_0075"
    },
    {
      "source": "SF_P_0074",
      "target": "SF_P_0092"
    },
    {
      "source": "SF_P_0075",
      "target": "SF_P_0074"
    },
    {
      "source": "SF_P_0075",
      "target": "SF_P_0076"
    },
    {
      "source": "SF_P_0075",
      "target": "SF_P_0099"
    },
    {
      "source": "SF_P_0076",
      "target": "SF_P_0075"
    },
    {
      "source": "SF_P_0076",
      "target": "SF_P_0077"
    },
    {
      "source": "SF_P_0076",
      "target": "SF_P_0089"
    },
    {
      "source": "SF_P_0077",
      "target": "SF_P_0076"
    },
    {
      "source": "SF_P_0077",
      "target": "SF_P_0078"
    },
    {
      "source": "SF_P_0077",
      "target": "SF_P_0033"
    },
    {
      "source": "SF_P_0078",
      "target": "SF_P_0077"
    },
    {
      "source": "SF_P_0078",
      "target": "SF_P_0079"
    },
    {
      "source": "SF_P_0078",
      "target": "SF_P_0064"
    },
    {
      "source": "SF_P_0079",
      "target": "SF_P_0078"
    },
    {
      "source": "SF_P_0079",
      "target": "SF_P_0080"
    },
    {
      "source": "SF_P_0079",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0080",
      "target": "SF_P_0079"
    },
    {
      "source": "SF_P_0080",
      "target": "SF_P_0081"
    },
    {
      "source": "SF_P_0080",
      "target": "SF_P_0092"
    },
    {
      "source": "SF_P_0080",
      "target": "SF_P_0062"
    },
    {
      "source": "SF_P_0081",
      "target": "SF_P_0080"
    },
    {
      "source": "SF_P_0081",
      "target": "SF_P_0082"
    },
    {
      "source": "SF_P_0081",
      "target": "SF_P_0006"
    },
    {
      "source": "SF_P_0082",
      "target": "SF_P_0081"
    },
    {
      "source": "SF_P_0082",
      "target": "SF_P_0083"
    },
    {
      "source": "SF_P_0082",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0083",
      "target": "SF_P_0082"
    },
    {
      "source": "SF_P_0083",
      "target": "SF_P_0084"
    },
    {
      "source": "SF_P_0083",
      "target": "SF_P_0063"
    },
    {
      "source": "SF_P_0084",
      "target": "SF_P_0083"
    },
    {
      "source": "SF_P_0084",
      "target": "SF_P_0085"
    },
    {
      "source": "SF_P_0084",
      "target": "SF_P_0074"
    },
    {
      "source": "SF_P_0085",
      "target": "SF_P_0084"
    },
    {
      "source": "SF_P_0085",
      "target": "SF_P_0086"
    },
    {
      "source": "SF_P_0085",
      "target": "SF_P_0116"
    },
    {
      "source": "SF_P_0086",
      "target": "SF_P_0085"
    },
    {
      "source": "SF_P_0086",
      "target": "SF_P_0087"
    },
    {
      "source": "SF_P_0086",
      "target": "SF_P_0071"
    },
    {
      "source": "SF_P_0087",
      "target": "SF_P_0086"
    },
    {
      "source": "SF_P_0087",
      "target": "SF_P_0088"
    },
    {
      "source": "SF_P_0087",
      "target": "SF_P_0025"
    },
    {
      "source": "SF_P_0088",
      "target": "SF_P_0087"
    },
    {
      "source": "SF_P_0088",
      "target": "SF_P_0089"
    },
    {
      "source": "SF_P_0088",
      "target": "SF_P_0093"
    },
    {
      "source": "SF_P_0089",
      "target": "SF_P_0088"
    },
    {
      "source": "SF_P_0089",
      "target": "SF_P_0090"
    },
    {
      "source": "SF_P_0089",
      "target": "SF_P_0076"
    },
    {
      "source": "SF_P_0090",
      "target": "SF_P_0089"
    },
    {
      "source": "SF_P_0090",
      "target": "SF_P_0091"
    },
    {
      "source": "SF_P_0090",
      "target": "SF_P_0080"
    },
    {
      "source": "SF_P_0091",
      "target": "SF_P_0090"
    },
    {
      "source": "SF_P_0091",
      "target": "SF_P_0062"
    },
    {
      "source": "SF_P_0091",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0091",
      "target": "SF_P_0092"
    },
    {
      "source": "SF_P_0092",
      "target": "SF_P_0091"
    },
    {
      "source": "SF_P_0092",
      "target": "SF_P_0080"
    },
    {
      "source": "SF_P_0092",
      "target": "SF_P_0093"
    },
    {
      "source": "SF_P_0092",
      "target": "SF_P_0001"
    },
    {
      "source": "SF_P_0093",
      "target": "SF_P_0092"
    },
    {
      "source": "SF_P_0093",
      "target": "SF_P_0094"
    },
    {
      "source": "SF_P_0093",
      "target": "SF_P_0074"
    },
    {
      "source": "SF_P_0094",
      "target": "SF_P_0093"
    },
    {
      "source": "SF_P_0094",
      "target": "SF_P_0095"
    },
    {
      "source": "SF_P_0094",
      "target": "SF_P_0096"
    },
    {
      "source": "SF_P_0095",
      "target": "SF_P_0094"
    },
    {
      "source": "SF_P_0095",
      "target": "SF_P_0096"
    },
    {
      "source": "SF_P_0095",
      "target": "SF_P_0087"
    },
    {
      "source": "SF_P_0096",
      "target": "SF_P_0095"
    },
    {
      "source": "SF_P_0096",
      "target": "SF_P_0097"
    },
    {
      "source": "SF_P_0096",
      "target": "SF_P_0041"
    },
    {
      "source": "SF_P_0097",
      "target": "SF_P_0096"
    },
    {
      "source": "SF_P_0097",
      "target": "SF_P_0098"
    },
    {
      "source": "SF_P_0097",
      "target": "SF_P_0044"
    },
    {
      "source": "SF_P_0098",
      "target": "SF_P_0097"
    },
    {
      "source": "SF_P_0098",
      "target": "SF_P_0099"
    },
    {
      "source": "SF_P_0098",
      "target": "SF_P_0057"
    },
    {
      "source": "SF_P_0099",
      "target": "SF_P_0098"
    },
    {
      "source": "SF_P_0099",
      "target": "SF_P_0100"
    },
    {
      "source": "SF_P_0099",
      "target": "SF_P_0075"
    },
    {
      "source": "SF_P_0100",
      "target": "SF_P_0099"
    },
    {
      "source": "SF_P_0100",
      "target": "SF_P_0101"
    },
    {
      "source": "SF_P_0100",
      "target": "SF_P_0066"
    },
    {
      "source": "SF_P_0101",
      "target": "SF_P_0100"
    },
    {
      "source": "SF_P_0101",
      "target": "SF_P_0102"
    },
    {
      "source": "SF_P_0101",
      "target": "SF_P_0051"
    },
    {
      "source": "SF_P_0102",
      "target": "SF_P_0101"
    },
    {
      "source": "SF_P_0102",
      "target": "SF_P_0103"
    },
    {
      "source": "SF_P_0102",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0103",
      "target": "SF_P_0102"
    },
    {
      "source": "SF_P_0103",
      "target": "SF_P_0104"
    },
    {
      "source": "SF_P_0103",
      "target": "SF_P_0073"
    },
    {
      "source": "SF_P_0104",
      "target": "SF_P_0103"
    },
    {
      "source": "SF_P_0104",
      "target": "SF_P_0105"
    },
    {
      "source": "SF_P_0104",
      "target": "SF_P_0054"
    },
    {
      "source": "SF_P_0105",
      "target": "SF_P_0104"
    },
    {
      "source": "SF_P_0105",
      "target": "SF_P_0106"
    },
    {
      "source": "SF_P_0105",
      "target": "SF_P_0057"
    },
    {
      "source": "SF_P_0106",
      "target": "SF_P_0105"
    },
    {
      "source": "SF_P_0106",
      "target": "SF_P_0107"
    },
    {
      "source": "SF_P_0106",
      "target": "SF_P_0025"
    },
    {
      "source": "SF_P_0107",
      "target": "SF_P_0106"
    },
    {
      "source": "SF_P_0107",
      "target": "SF_P_0108"
    },
    {
      "source": "SF_P_0107",
      "target": "SF_P_0025"
    },
    {
      "source": "SF_P_0108",
      "target": "SF_P_0107"
    },
    {
      "source": "SF_P_0108",
      "target": "SF_P_0109"
    },
    {
      "source": "SF_P_0108",
      "target": "SF_P_0047"
    },
    {
      "source": "SF_P_0109",
      "target": "SF_P_0108"
    },
    {
      "source": "SF_P_0109",
      "target": "SF_P_0110"
    },
    {
      "source": "SF_P_0109",
      "target": "SF_P_0045"
    },
    {
      "source": "SF_P_0110",
      "target": "SF_P_0109"
    },
    {
      "source": "SF_P_0110",
      "target": "SF_P_0111"
    },
    {
      "source": "SF_P_0110",
      "target": "SF_P_0048"
    },
    {
      "source": "SF_P_0111",
      "target": "SF_P_0110"
    },
    {
      "source": "SF_P_0111",
      "target": "SF_P_0112"
    },
    {
      "source": "SF_P_0111",
      "target": "SF_P_0004"
    },
    {
      "source": "SF_P_0112",
      "target": "SF_P_0111"
    },
    {
      "source": "SF_P_0112",
      "target": "SF_P_0113"
    },
    {
      "source": "SF_P_0112",
      "target": "SF_P_0094"
    },
    {
      "source": "SF_P_0113",
      "target": "SF_P_0112"
    },
    {
      "source": "SF_P_0113",
      "target": "SF_P_0114"
    },
    {
      "source": "SF_P_0113",
      "target": "SF_P_0043"
    },
    {
      "source": "SF_P_0114",
      "target": "SF_P_0113"
    },
    {
      "source": "SF_P_0114",
      "target": "SF_P_0115"
    },
    {
      "source": "SF_P_0114",
      "target": "SF_P_0049"
    },
    {
      "source": "SF_P_0115",
      "target": "SF_P_0114"
    },
    {
      "source": "SF_P_0115",
      "target": "SF_P_0116"
    },
    {
      "source": "SF_P_0115",
      "target": "SF_P_0029"
    },
    {
      "source": "SF_P_0116",
      "target": "SF_P_0115"
    },
    {
      "source": "SF_P_0116",
      "target": "SF_P_0117"
    },
    {
      "source": "SF_P_0116",
      "target": "SF_P_0056"
    },
    {
      "source": "SF_P_0117",
      "target": "SF_P_0116"
    },
    {
      "source": "SF_P_0117",
      "target": "SF_P_0118"
    },
    {
      "source": "SF_P_0117",
      "target": "SF_P_0046"
    },
    {
      "source": "SF_P_0118",
      "target": "SF_P_0117"
    },
    {
      "source": "SF_P_0118",
      "target": "SF_P_0119"
    },
    {
      "source": "SF_P_0118",
      "target": "SF_P_0036"
    },
    {
      "source": "SF_P_0119",
      "target": "SF_P_0118"
    },
    {
      "source": "SF_P_0119",
      "target": "SF_P_0120"
    },
    {
      "source": "SF_P_0119",
      "target": "SF_P_0050"
    },
    {
      "source": "SF_P_0120",
      "target": "SF_P_0119"
    },
    {
      "source": "SF_P_0120",
      "target": "SF_P_0121"
    },
    {
      "source": "SF_P_0120",
      "target": "SF_P_0055"
    },
    {
      "source": "SF_P_0121",
      "target": "SF_P_0120"
    },
    {
      "source": "SF_P_0121",
      "target": "SF_P_0092"
    },
    {
      "source": "SF_P_0121",
      "target": "SF_P_0001"
    },
    {
      "source": "SF_P_0121",
      "target": "SF_P_0041"
    }
  ],
  "documents": [
    {
      "id": "SF_D_NODE_0001",
      "type": "NODE",
      "nodeId": "SF_P_0001",
      "title": "Cómo leer este ecosistema",
      "doc_id": "core-00",
      "series": "core-00 · Meta",
      "summary": "Documento metodológico. Tono, progresión y límites del archivo.",
      "version": "1.1",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "R_m",
      "mihm_equation": "R_m = rigor_metodológico",
      "sf_pattern": "metodología",
      "mihm_note": "Define el marco de lectura y reduce ambigüedad interpretativa.",
      "patterns": [
        "metodología",
        "tono",
        "límites-marco"
      ],
      "contentLength": 16925,
      "contentHash": "3958284313172842"
    },
    {
      "id": "SF_D_NODE_0002",
      "type": "NODE",
      "nodeId": "SF_P_0002",
      "title": "Desde dónde observa el observador",
      "doc_id": "core-0",
      "series": "core-0 · Posición",
      "summary": "Condición de percepción, no autobiografía. Umbral antes del primer caso.",
      "version": "1.1",
      "node": "docs",
      "mihm_variable": "P_o",
      "mihm_equation": "P_o = posición_observador",
      "sf_pattern": "posición-observador",
      "mihm_note": "Explicita el punto de observación que condiciona el análisis.",
      "patterns": [
        "posición-observador",
        "límites-marco"
      ],
      "contentLength": 1867,
      "contentHash": "72c304e06914b3d8"
    },
    {
      "id": "SF_D_NODE_0003",
      "type": "NODE",
      "nodeId": "SF_P_0003",
      "title": "Fricción Sistémica · Variable F_s",
      "doc_id": "var-0003",
      "series": "MIHM v3 · Variable F_s",
      "summary": "Fricción Sistémica es el concepto central del marco. Cuantifica la pérdida de señal entre la observa...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "F_s",
      "mihm_equation": "F_s = (t_d / T_esp) + O",
      "sf_pattern": "latencia-politica",
      "mihm_note": "Peso en IHG: 0.1. Capa: theory.",
      "patterns": [
        "latencia-politica",
        "umbral-dual"
      ],
      "contentLength": 3124,
      "contentHash": "21996ddf8898c94a"
    },
    {
      "id": "SF_D_NODE_0004",
      "type": "NODE",
      "nodeId": "SF_P_0004",
      "title": "Interacción Humana Multicanal · Variable I_mc",
      "doc_id": "var-0004",
      "series": "MIHM v3 · Variable I_mc",
      "summary": "La Interacción Humana Multicanal reconoce que los sistemas institucionales operan con múltiples cana...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "I_mc",
      "mihm_equation": "I_mc = 1 - (d_c / C_t)",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Peso en IHG: 0.0833. Capa: theory.",
      "patterns": [
        "coherencia-aparente",
        "umbral-dual"
      ],
      "contentLength": 3113,
      "contentHash": "8dfd2ba72cbe8117"
    },
    {
      "id": "SF_D_NODE_0005",
      "type": "NODE",
      "nodeId": "SF_P_0005",
      "title": "Energía Relacional · Variable E_r",
      "doc_id": "var-0005",
      "series": "MIHM v3 · Variable E_r",
      "summary": "La Energía Relacional mide la vitalidad de los vínculos operativos entre agentes institucionales. Su...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "E_r",
      "mihm_equation": "E_r = (C_v / T_m) * (1 - D_f)",
      "sf_pattern": "deuda-temporal",
      "mihm_note": "Peso en IHG: 0.0833. Capa: theory.",
      "patterns": [
        "deuda-temporal",
        "umbral-dual"
      ],
      "contentLength": 3074,
      "contentHash": "1be2149741748b05"
    },
    {
      "id": "SF_D_NODE_0006",
      "type": "NODE",
      "nodeId": "SF_P_0006",
      "title": "Densidad de Interacción · Variable D_i",
      "doc_id": "var-0006",
      "series": "MIHM v3 · Variable D_i",
      "summary": "La Densidad de Interacción es una métrica que cuantifica la intensidad comunicacional de un sistema....",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "D_i",
      "mihm_equation": "D_i = (I_t / N) / C_p",
      "sf_pattern": "señal-ruido",
      "mihm_note": "Peso en IHG: 0.075. Capa: theory.",
      "patterns": [
        "señal-ruido",
        "umbral-dual"
      ],
      "contentLength": 3056,
      "contentHash": "0d5a51a1f52fadb2"
    },
    {
      "id": "SF_D_NODE_0007",
      "type": "NODE",
      "nodeId": "SF_P_0007",
      "title": "Gradiente de Fricción · Variable G_f",
      "doc_id": "var-0007",
      "series": "MIHM v3 · Variable G_f",
      "summary": "El Gradiente de Fricción describe cómo la fricción no es uniforme en un sistema: se concentra en pun...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "G_f",
      "mihm_equation": "G_f = max(|F_s_i - F_s_j| / d_ij)",
      "sf_pattern": "umbral-dual",
      "mihm_note": "Peso en IHG: 0.1. Capa: theory.",
      "patterns": [
        "umbral-dual",
        "umbral-dual"
      ],
      "contentLength": 3094,
      "contentHash": "42af56c1522a373f"
    },
    {
      "id": "SF_D_NODE_0008",
      "type": "NODE",
      "nodeId": "SF_P_0008",
      "title": "Coherencia Sistémica · Variable C_s",
      "doc_id": "var-0008",
      "series": "MIHM v3 · Variable C_s",
      "summary": "La Coherencia Sistémica es un indicador de la salud estructural de una institución. Su degradación n...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "C_s",
      "mihm_equation": "C_s = 1 - |D_o - R_o| / max(D_o, 0.01)",
      "sf_pattern": "compliance-narrativo",
      "mihm_note": "Peso en IHG: 0.1. Capa: theory.",
      "patterns": [
        "compliance-narrativo",
        "umbral-dual"
      ],
      "contentLength": 3142,
      "contentHash": "7cb0de0743c894b4"
    },
    {
      "id": "SF_D_NODE_0009",
      "type": "NODE",
      "nodeId": "SF_P_0009",
      "title": "Desfase Cognitivo · Variable D_cog",
      "doc_id": "var-0009",
      "series": "MIHM v3 · Variable D_cog",
      "summary": "El Desfase Cognitivo es la brecha entre lo que una institución cree que está ocurriendo y lo que est...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "D_cog",
      "mihm_equation": "D_cog = t_d / t_ref",
      "sf_pattern": "contexto-perdido",
      "mihm_note": "Peso en IHG: 0.075. Capa: theory.",
      "patterns": [
        "contexto-perdido",
        "umbral-dual"
      ],
      "contentLength": 3115,
      "contentHash": "ae90ed7475343a30"
    },
    {
      "id": "SF_D_NODE_0010",
      "type": "NODE",
      "nodeId": "SF_P_0010",
      "title": "Resonancia Semántica · Variable R_sem",
      "doc_id": "var-0010",
      "series": "MIHM v3 · Variable R_sem",
      "summary": "La Resonancia Semántica es crítica para la eficacia institucional. Cuando dos nodos usan los mismos ...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "R_sem",
      "mihm_equation": "R_sem = (T_com / T_total) * (1 - D_sem)",
      "sf_pattern": "decisión-emergente",
      "mihm_note": "Peso en IHG: 0.1. Capa: theory.",
      "patterns": [
        "decisión-emergente",
        "umbral-dual"
      ],
      "contentLength": 3150,
      "contentHash": "b6a9740cdb682908"
    },
    {
      "id": "SF_D_NODE_0011",
      "type": "NODE",
      "nodeId": "SF_P_0011",
      "title": "Vector Intencional · Variable V_i",
      "doc_id": "var-0011",
      "series": "MIHM v3 · Variable V_i",
      "summary": "El Vector Intencional reconoce que los agentes institucionales operan con múltiples capas de intenci...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "V_i",
      "mihm_equation": "V_i = (I_r / I_d) * (1 - D_i_vec)",
      "sf_pattern": "incentivo-contradictorio",
      "mihm_note": "Peso en IHG: 0.0833. Capa: theory.",
      "patterns": [
        "incentivo-contradictorio",
        "umbral-dual"
      ],
      "contentLength": 3159,
      "contentHash": "021943b11943ea6c"
    },
    {
      "id": "SF_D_NODE_0012",
      "type": "NODE",
      "nodeId": "SF_P_0012",
      "title": "Campo Semántico Compartido · Variable C_sem",
      "doc_id": "var-0012",
      "series": "MIHM v3 · Variable C_sem",
      "summary": "El Campo Semántico Compartido es el sustrato invisible de la coordinación institucional. Su degradac...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "C_sem",
      "mihm_equation": "C_sem = V_com / V_total",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Peso en IHG: 0.1. Capa: theory.",
      "patterns": [
        "coherencia-aparente",
        "umbral-dual"
      ],
      "contentLength": 3130,
      "contentHash": "214ae7120d3611df"
    },
    {
      "id": "SF_D_NODE_0013",
      "type": "NODE",
      "nodeId": "SF_P_0013",
      "title": "Decisiones que nadie tomó",
      "doc_id": "doc-01",
      "series": "01 · Fundamentos",
      "summary": "Cristalización por acumulación. Zonas grises operativas.",
      "version": "1.0",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "M_i",
      "mihm_equation": "M_i = gap(discurso, función observada)",
      "sf_pattern": "decisión-emergente",
      "mihm_note": "La coherencia entre discurso y operación determina estabilidad narrativa.",
      "patterns": [
        "decisión-emergente",
        "cristalización-normativa",
        "zona-gris",
        "coherencia-aparente"
      ],
      "contentLength": 1850,
      "contentHash": "205d0eae1fd1b49f"
    },
    {
      "id": "SF_D_NODE_0014",
      "type": "NODE",
      "nodeId": "SF_P_0014",
      "title": "Costo real de adoptable",
      "doc_id": "doc-02",
      "series": "02 · Fundamentos",
      "summary": "Por qué soluciones superiores no se implementan.",
      "version": "1.0",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "C_a",
      "mihm_equation": "C_a = costo_real / costo_declarado",
      "sf_pattern": "adoptable-degradado",
      "mihm_note": "Cuando el costo real supera el declarado, cae adopción efectiva.",
      "patterns": [
        "fricción-política",
        "costo-de-adopción",
        "distancia-diseño-consecuencia",
        "asimetría-exposición"
      ],
      "contentLength": 2324,
      "contentHash": "fd4719d4998a4dc0"
    },
    {
      "id": "SF_D_NODE_0015",
      "type": "NODE",
      "nodeId": "SF_P_0015",
      "title": "Compliance como narrativa",
      "doc_id": "doc-03",
      "series": "03 · Fundamentos",
      "summary": "Auditabilidad vs seguridad. Forma vs sustancia.",
      "version": "1.0",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "NTI",
      "mihm_equation": "NTI = integridad(señal oficial, señal operativa)",
      "sf_pattern": "compliance-narrativo",
      "mihm_note": "Compliance estable con operación inestable reduce integridad de señal.",
      "patterns": [
        "proxy-objetivo",
        "desalineación-métricas",
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 2134,
      "contentHash": "82d7916e931fef40"
    },
    {
      "id": "SF_D_NODE_0016",
      "type": "NODE",
      "nodeId": "SF_P_0016",
      "title": "Dinero como estructura temporal",
      "doc_id": "doc-04",
      "series": "04 · Fundamentos",
      "summary": "Opcionalidad temporal. Horizonte de maniobra.",
      "version": "1.1",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "T_d",
      "mihm_equation": "T_d = deuda_tiempo_decisión",
      "sf_pattern": "deuda-temporal",
      "mihm_note": "La deuda temporal desplaza costo al futuro hasta volverlo crítico.",
      "patterns": [
        "opcionalidad",
        "horizonte-maniobra",
        "asimetría-exposición",
        "reversibilidad"
      ],
      "contentLength": 2521,
      "contentHash": "def027fbe02fae67"
    },
    {
      "id": "SF_D_NODE_0017",
      "type": "NODE",
      "nodeId": "SF_P_0017",
      "title": "Escritura sin intención visible",
      "doc_id": "doc-05",
      "series": "05 · Técnica",
      "summary": "Señal sin ornamentación. Extracción por diseño.",
      "version": "1.0",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "I_e",
      "mihm_equation": "I_e = intención_explícita / efecto_sistémico",
      "sf_pattern": "escritura-sin-intención",
      "mihm_note": "Mayor distancia intención-efecto incrementa ambigüedad operativa.",
      "patterns": [
        "señal-ruido",
        "densidad-semántica",
        "escritura-técnica",
        "economía-palabras"
      ],
      "contentLength": 2170,
      "contentHash": "1cc2c4bc86ec83d6"
    },
    {
      "id": "SF_D_NODE_0018",
      "type": "NODE",
      "nodeId": "SF_P_0018",
      "title": "Sistemas de alerta que nadie revisa",
      "doc_id": "doc-06",
      "series": "06 · Fundamentos",
      "summary": "Métrica vs señal. Cobertura vs acción.",
      "version": "1.0",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "A_r",
      "mihm_equation": "A_r = alertas_revisadas / alertas_emitidas",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "El sistema emite señal, pero sin revisión no existe corrección.",
      "patterns": [
        "señal-ruido",
        "desalineación-métricas",
        "costo-atención",
        "umbral-fijo"
      ],
      "contentLength": 2221,
      "contentHash": "56139a2ae8922bcd"
    },
    {
      "id": "SF_D_NODE_0019",
      "type": "NODE",
      "nodeId": "SF_P_0019",
      "title": "Contexto perdido",
      "doc_id": "doc-07",
      "series": "07 · Fundamentos",
      "summary": "Decaimiento del razonamiento por pérdida de restricciones.",
      "version": "1.0",
      "stability": "alta",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "C_x",
      "mihm_equation": "C_x = contexto_disponible / contexto_requerido",
      "sf_pattern": "contexto-perdido",
      "mihm_note": "Con contexto incompleto, la decisión se optimiza para apariencia.",
      "patterns": [
        "decaimiento-contexto",
        "decisión-emergente",
        "rotación-conocimiento",
        "deuda-documental"
      ],
      "contentLength": 2266,
      "contentHash": "e340a2a9f7fe5e1a"
    },
    {
      "id": "SF_D_NODE_0020",
      "type": "NODE",
      "nodeId": "SF_P_0020",
      "title": "Personas en alta incertidumbre",
      "doc_id": "doc-08",
      "series": "08 · Perfil",
      "summary": "Operación eficaz sin reglas estables.",
      "version": "1.0",
      "stability": "media",
      "first_published": "2026-02-02",
      "node": "docs",
      "mihm_variable": "U_h",
      "mihm_equation": "U_h = incertidumbre_operativa_humana",
      "sf_pattern": "incertidumbre-humana",
      "mihm_note": "La carga cognitiva eleva variabilidad conductual bajo presión.",
      "patterns": [
        "tolerancia-incertidumbre",
        "validación-interna",
        "reversibilidad",
        "opcionalidad"
      ],
      "contentLength": 2354,
      "contentHash": "66f12023bb8b49f8"
    },
    {
      "id": "SF_D_NODE_0021",
      "type": "NODE",
      "nodeId": "SF_P_0021",
      "title": "Sistemas que no pueden permitirse fallar",
      "doc_id": "core-bridge",
      "series": "core-bridge · Puente",
      "summary": "Umbral real vs oficial. La distancia donde opera el operador.",
      "version": "1.1",
      "first_published": "2026-02-23",
      "node": "docs",
      "mihm_variable": "NTI",
      "mihm_equation": "NTI = integridad(señal, realidad)",
      "sf_pattern": "distancia-umbrales",
      "mihm_note": "Conecta umbral oficial con umbral real en capa operativa.",
      "patterns": [
        "umbral-real",
        "distancia-umbrales",
        "fricción-política"
      ],
      "contentLength": 3174,
      "contentHash": "61ac97adfa81eee5"
    },
    {
      "id": "SF_D_NODE_0022",
      "type": "NODE",
      "nodeId": "SF_P_0022",
      "title": "Teoría de Campos Cognitivos · Variable Phi",
      "doc_id": "var-0022",
      "series": "MIHM v3 · Variable Phi",
      "summary": "La Teoría de Campos Cognitivos propone que el conocimiento institucional no es discreto sino continu...",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "Phi",
      "mihm_equation": "Phi = sum(w_i * K(x, x_i))",
      "sf_pattern": "metodología",
      "mihm_note": "Peso en IHG: 0.1. Capa: theory.",
      "patterns": [
        "metodología",
        "umbral-dual"
      ],
      "contentLength": 3094,
      "contentHash": "0535db03f0487dde"
    },
    {
      "id": "SF_D_NODE_0023",
      "type": "NODE",
      "nodeId": "SF_P_0023",
      "title": "Dinámica de Interacciones Humanas",
      "doc_id": "th-0023",
      "series": "Teoría · Theory",
      "summary": "La Dinámica de Interacciones Humanas reconoce que los sistemas institucionales son sistemas dinámicos con atractores, bi",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "patron_interaccion,trayectoria_dinamica",
      "mihm_equation": "dX/dt = F(X, friccion, t)",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1741,
      "contentHash": "4c7491fa73528e89"
    },
    {
      "id": "SF_D_NODE_0024",
      "type": "NODE",
      "nodeId": "SF_P_0024",
      "title": "Modelo de Energía Relacional",
      "doc_id": "th-0024",
      "series": "Teoría · Theory",
      "summary": "El Modelo de Energía Relacional formaliza la intuición de que las instituciones tienen recursos limitados para mantener ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "energia_total,distribucion_nodal",
      "mihm_equation": "E_total = sum(E_ij) para todos los vínculos activos",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1763,
      "contentHash": "c287d17b1bcabeb6"
    },
    {
      "id": "SF_D_NODE_0025",
      "type": "NODE",
      "nodeId": "SF_P_0025",
      "title": "Topología de Sistemas Sociales",
      "doc_id": "th-0025",
      "series": "Teoría · Theory",
      "summary": "La Topología de Sistemas Sociales proporciona el mapa estructural sobre el que se calculan todas las métricas MIHM. La m",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "grado_nodal,centralidad",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1678,
      "contentHash": "20be87e233b5a7d4"
    },
    {
      "id": "SF_D_NODE_0026",
      "type": "NODE",
      "nodeId": "SF_P_0026",
      "title": "Arquitectura de Señal Humana",
      "doc_id": "th-0026",
      "series": "Teoría · Theory",
      "summary": "La Arquitectura de Señal Humana formaliza la descripción de cómo circula la información en una institución: qué canales ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "canales_activos,fidelidad",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1628,
      "contentHash": "07a73a3068beeb0b"
    },
    {
      "id": "SF_D_NODE_0027",
      "type": "NODE",
      "nodeId": "SF_P_0027",
      "title": "Modelo de Ruido Social",
      "doc_id": "th-0027",
      "series": "Teoría · Theory",
      "summary": "El Modelo de Ruido Social categoriza los tipos de interferencia que degradan la señal institucional: ruido estructural (",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "tipo_ruido,intensidad",
      "mihm_equation": "SNR = Potencia_señal / Potencia_ruido",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1759,
      "contentHash": "7032b9f5e6a18f83"
    },
    {
      "id": "SF_D_NODE_0028",
      "type": "NODE",
      "nodeId": "SF_P_0028",
      "title": "Principio de Fricción Cognitiva",
      "doc_id": "th-0028",
      "series": "Teoría · Theory",
      "summary": "El Principio de Fricción Cognitiva establece que la fricción es una propiedad emergente del sistema, no una característi",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "derivada",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1582,
      "contentHash": "073e23a83c366d6d"
    },
    {
      "id": "SF_D_NODE_0029",
      "type": "NODE",
      "nodeId": "SF_P_0029",
      "title": "Teoría de Resonancia Social",
      "doc_id": "th-0029",
      "series": "Teoría · Theory",
      "summary": "La Teoría de Resonancia Social describe cómo ciertos patrones de comportamiento se amplifican a través del sistema cuand",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "frecuencia_patron,amplitud",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1622,
      "contentHash": "dc44fe0c0271f216"
    },
    {
      "id": "SF_D_NODE_0030",
      "type": "NODE",
      "nodeId": "SF_P_0030",
      "title": "Teoría de Desfase Conversacional",
      "doc_id": "th-0030",
      "series": "Teoría · Theory",
      "summary": "La Teoría de Desfase Conversacional formaliza el patrón descrito en doc-07 (Contexto perdido): la información pierde pre",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "t_evento,t_registro",
      "mihm_equation": "Desfase = (t_decision - t_evento) * tasa_degradacion",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1741,
      "contentHash": "75cb2392d6d1094b"
    },
    {
      "id": "SF_D_NODE_0031",
      "type": "NODE",
      "nodeId": "SF_P_0031",
      "title": "Modelo de Coherencia de Grupo",
      "doc_id": "th-0031",
      "series": "Teoría · Theory",
      "summary": "El Modelo de Coherencia de Grupo distingue entre la coherencia declarada (el equipo dice estar alineado) y la coherencia",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "coherencia_declarada,coherencia_operativa",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1653,
      "contentHash": "7c272d30dadeea3f"
    },
    {
      "id": "SF_D_NODE_0034",
      "type": "NODE",
      "nodeId": "SF_P_0034",
      "title": "Modelo de Campo Semántico",
      "doc_id": "th-0034",
      "series": "Teoría · Theory",
      "summary": "El Modelo de Campo Semántico formaliza cómo el significado se distribuye en una institución: hay zonas de alta densidad ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "densidad_semantica,ambiguedad_local",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1696,
      "contentHash": "5ecb042ec6087861"
    },
    {
      "id": "SF_D_NODE_0035",
      "type": "NODE",
      "nodeId": "SF_P_0035",
      "title": "Arquitectura de Interacción",
      "doc_id": "th-0035",
      "series": "Teoría · Theory",
      "summary": "La Arquitectura de Interacción describe el diseño (implícito o explícito) de cómo un sistema organiza sus interacciones.",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "estructura_canales,protocolos_interaccion",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1672,
      "contentHash": "f483195112213447"
    },
    {
      "id": "SF_D_NODE_0036",
      "type": "NODE",
      "nodeId": "SF_P_0036",
      "title": "Modelo de Perturbación Cognitiva",
      "doc_id": "th-0036",
      "series": "Teoría · Theory",
      "summary": "El Modelo de Perturbación Cognitiva describe cómo los shocks externos o internos se propagan a través del campo cognitiv",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "intensidad_perturbacion,propagacion",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1660,
      "contentHash": "4b861bce8e506de4"
    },
    {
      "id": "SF_D_NODE_0037",
      "type": "NODE",
      "nodeId": "SF_P_0037",
      "title": "Teoría de Equilibrio Social",
      "doc_id": "th-0037",
      "series": "Teoría · Theory",
      "summary": "La Teoría de Equilibrio Social en System Friction distingue entre equilibrios estables (el sistema regresa activamente a",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "tipo_equilibrio,basin_atraccion",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1680,
      "contentHash": "d13360f09fa71268"
    },
    {
      "id": "SF_D_NODE_0038",
      "type": "NODE",
      "nodeId": "SF_P_0038",
      "title": "Modelo de Dinámica de Fricción",
      "doc_id": "th-0038",
      "series": "Teoría · Theory",
      "summary": "El Modelo de Dinámica de Fricción describe la fricción no como un estado sino como un proceso: se acumula, se redistribu",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "tasa_acumulacion,tasa_disipacion",
      "mihm_equation": "dFS/dt = acumulacion(t) - disipacion(t)",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1743,
      "contentHash": "00bec6747a193c5d"
    },
    {
      "id": "SF_D_NODE_0039",
      "type": "NODE",
      "nodeId": "SF_P_0039",
      "title": "Teoría de Transferencia Semántica",
      "doc_id": "th-0039",
      "series": "Teoría · Theory",
      "summary": "La Teoría de Transferencia Semántica reconoce que el significado no se transmite perfectamente entre agentes. Cada trans",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "fidelidad_transferencia,variacion_semantica",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1685,
      "contentHash": "385a728119de6317"
    },
    {
      "id": "SF_D_NODE_0040",
      "type": "NODE",
      "nodeId": "SF_P_0040",
      "title": "Modelo Global de Interacción Humana",
      "doc_id": "th-0040",
      "series": "Teoría · Theory",
      "summary": "El Modelo Global de Interacción Humana es la integración teórica de los conceptos anteriores en un marco unificado. Prop",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "derivada",
      "mihm_equation": "ver variables dependientes",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Capa teórica. Alimenta variables MIHM v3 de forma indirecta.",
      "patterns": [
        "coherencia-aparente",
        "señal-ruido"
      ],
      "contentLength": 1544,
      "contentHash": "31ca266513eaa70c"
    },
    {
      "id": "SF_D_NODE_0041",
      "type": "NODE",
      "nodeId": "SF_P_0041",
      "title": "MIHM v2.0 — Motor Cuantitativo",
      "contentLength": 13629,
      "contentHash": "e9093374071ea508"
    },
    {
      "id": "SF_D_NODE_0042",
      "type": "NODE",
      "nodeId": "SF_P_0042",
      "title": "Ecuación de Fricción Cognitiva",
      "doc_id": "math-0042",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Ecuación de Fricción Cognitiva es la expresión matemática central del modelo MIHM. Traduce los conceptos de fricción ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "distancia_semantica,energia_interaccion",
      "mihm_equation": "FC(i,j) = d_sem(i,j) * (1 + λ_t) * N_cognitivo / E_relacional",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1693,
      "contentHash": "1204e547d5d447b4"
    },
    {
      "id": "SF_D_NODE_0043",
      "type": "NODE",
      "nodeId": "SF_P_0043",
      "title": "Modelo de Campo Semántico (Matemático)",
      "doc_id": "math-0043",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Modelo de Campo Semántico Matemático traduce la descripción conceptual del campo semántico en un objeto matemático fo",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "potencial_semantico,gradiente_semantico",
      "mihm_equation": " ?(x) = potencial_semantico_en_nodo_x",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1683,
      "contentHash": "e136f7b36c8a5a44"
    },
    {
      "id": "SF_D_NODE_0044",
      "type": "NODE",
      "nodeId": "SF_P_0044",
      "title": "Métrica de Resonancia",
      "doc_id": "math-0044",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Métrica de Resonancia (MR) detecta cuando dos o más nodos del sistema se están sincronizando de manera que sus variac",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "MR,correlacion_nodal",
      "mihm_equation": "MR(i,j) = correlacion(serie_i, serie_j) * amplitud_media(i,j)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1637,
      "contentHash": "48def1409e683077"
    },
    {
      "id": "SF_D_NODE_0045",
      "type": "NODE",
      "nodeId": "SF_P_0045",
      "title": "Índice de Coherencia Conversacional",
      "doc_id": "math-0045",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Índice de Coherencia Conversacional (ICC) mide qué proporción de los intercambios en un sistema produce alineación se",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "ICC,intercambios_alineados",
      "mihm_equation": "ICC = intercambios_alineados / intercambios_totales * (1 - ruido_contextual)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1612,
      "contentHash": "9f2d4985de753807"
    },
    {
      "id": "SF_D_NODE_0046",
      "type": "NODE",
      "nodeId": "SF_P_0046",
      "title": "Función de Latencia Social",
      "doc_id": "math-0046",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Función de Latencia Social describe la latencia no como un valor fijo sino como una función dinámica que depende del ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "carga_comunicacional,topologia",
      "mihm_equation": "L(t) = L_base * (1 + α*friccion(t)) * (1 + β*carga(t)) / capacidad_procesamiento(t)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1622,
      "contentHash": "49508bb6506d371a"
    },
    {
      "id": "SF_D_NODE_0047",
      "type": "NODE",
      "nodeId": "SF_P_0047",
      "title": "Métrica de Ruido Cognitivo",
      "doc_id": "math-0047",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Métrica de Ruido Cognitivo (MRC) cuantifica qué proporción de la capacidad cognitiva del sistema se consume en proces",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "MRC,señales_procesadas",
      "mihm_equation": "MRC = 1 - (señales_accionables / señales_procesadas)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1546,
      "contentHash": "cc607b1ac12dea63"
    },
    {
      "id": "SF_D_NODE_0048",
      "type": "NODE",
      "nodeId": "SF_P_0048",
      "title": "Modelo de Energía de Interacción",
      "doc_id": "math-0048",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Modelo de Energía de Interacción formaliza el concepto de energía relacional en términos matemáticos, permitiendo cal",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "energia_disponible,energia_consumida",
      "mihm_equation": "E_balance(t) = E_disponible(t) - E_consumida(t)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1636,
      "contentHash": "bd1b9a01bc744245"
    },
    {
      "id": "SF_D_NODE_0049",
      "type": "NODE",
      "nodeId": "SF_P_0049",
      "title": "Métrica de Divergencia Semántica",
      "doc_id": "math-0049",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Métrica de Divergencia Semántica (MDS) mide qué tan diferentes son los significados que distintos nodos asignan a los",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "MDS,distancia_semantica",
      "mihm_equation": "MDS(i,j) = distancia_coseno(vector_semantico_i, vector_semantico_j)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1623,
      "contentHash": "ce04a8f1561a8b71"
    },
    {
      "id": "SF_D_NODE_0050",
      "type": "NODE",
      "nodeId": "SF_P_0050",
      "title": "Modelo de Transferencia de Significado",
      "doc_id": "math-0050",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Modelo de Transferencia de Significado formaliza matemáticamente cómo el significado fluye entre nodos, incluyendo la",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "fidelidad,tasa_perdida",
      "mihm_equation": "S(n) = S(0) * prod(f_i) para i=1 a n transferencias",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1612,
      "contentHash": "c17a3b92b877bec1"
    },
    {
      "id": "SF_D_NODE_0051",
      "type": "NODE",
      "nodeId": "SF_P_0051",
      "title": "Índice de Sincronización Cognitiva",
      "doc_id": "math-0051",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Índice de Sincronización Cognitiva (ISC) mide qué tan sincronizados están los ciclos de procesamiento de información ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "ISC,sincronizacion_temporal",
      "mihm_equation": "ISC = (sincronizacion_temporal * alineacion_semantica)^0.5",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1601,
      "contentHash": "cfde23b2b4212121"
    },
    {
      "id": "SF_D_NODE_0052",
      "type": "NODE",
      "nodeId": "SF_P_0052",
      "title": "Métrica de Fricción Adaptativa",
      "doc_id": "math-0052",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Métrica de Fricción Adaptativa (MFA) distingue entre la fricción que el sistema necesita para funcionar correctamente",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "MFA,friccion_adaptativa",
      "mihm_equation": "MFA = friccion_adaptativa / friccion_total",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1631,
      "contentHash": "97e2e6b84d2fb71d"
    },
    {
      "id": "SF_D_NODE_0053",
      "type": "NODE",
      "nodeId": "SF_P_0053",
      "title": "Función de Perturbación Conversacional",
      "doc_id": "math-0053",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Función de Perturbación Conversacional describe cómo el estado de un sistema de comunicación institucional cambia ant",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "intensidad_perturbacion,tipo_perturbacion",
      "mihm_equation": "R(P) = R_0 + α*P + β*P² + ... (expansión en potencias)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1690,
      "contentHash": "7797ed214edb99ec"
    },
    {
      "id": "SF_D_NODE_0054",
      "type": "NODE",
      "nodeId": "SF_P_0054",
      "title": "Métrica de Densidad de Interacción",
      "doc_id": "math-0054",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Métrica de Densidad de Interacción (MDI) cuantifica la intensidad comunicacional del sistema. Se diferencia del mero ",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "MDI,interacciones_periodo",
      "mihm_equation": "MDI = interacciones_verificadas / (nodos_activos * periodo * capacidad_procesamiento)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1630,
      "contentHash": "9b61320cf484a0cc"
    },
    {
      "id": "SF_D_NODE_0055",
      "type": "NODE",
      "nodeId": "SF_P_0055",
      "title": "Modelo de Estabilidad Relacional",
      "doc_id": "math-0055",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Modelo de Estabilidad Relacional formaliza qué hace que un vínculo institucional sea estable: su energía, su redundan",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "energia_vinculo,redundancia",
      "mihm_equation": "E_estabilidad(i,j) = E_relacional(i,j) / perturbacion_esperada(i,j)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1606,
      "contentHash": "9177e729592c5a95"
    },
    {
      "id": "SF_D_NODE_0056",
      "type": "NODE",
      "nodeId": "SF_P_0056",
      "title": "Catálogo de patrones",
      "version": "1.0",
      "stability": "activo",
      "contentLength": 5109,
      "contentHash": "cc989e569c0ed45d"
    },
    {
      "id": "SF_D_NODE_0057",
      "type": "NODE",
      "nodeId": "SF_P_0057",
      "title": "Modelo de Gradiente de Fricción",
      "doc_id": "math-0057",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Modelo de Gradiente de Fricción formaliza la descripción de cómo la fricción se distribuye de manera no uniforme en e",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "gradiente_friccion,distribucion_espacial",
      "mihm_equation": "GF(x) =  ^?FS(x) = ( ^,FS/ ^,x,  ^,FS/ ^,y)",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1638,
      "contentHash": "f3c25079dd2aed26"
    },
    {
      "id": "SF_D_NODE_0058",
      "type": "NODE",
      "nodeId": "SF_P_0058",
      "title": "Métrica de Ruido Social",
      "doc_id": "math-0058",
      "series": "Matemáticas · Motor MIHM",
      "summary": "La Métrica de Ruido Social (MRS) distingue el ruido de origen social del ruido técnico. El ruido social es producido por",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "MRS,ruido_motivacional",
      "mihm_equation": "MRS = (ruido_motivacional + ruido_cultural + ruido_politico) / señal_total",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1612,
      "contentHash": "103c62e5ba4fd937"
    },
    {
      "id": "SF_D_NODE_0059",
      "type": "NODE",
      "nodeId": "SF_P_0059",
      "title": "Modelo de Campo Conversacional",
      "doc_id": "math-0059",
      "series": "Matemáticas · Motor MIHM",
      "summary": "El Modelo de Campo Conversacional trata las conversaciones institucionales no como eventos discretos sino como manifesta",
      "version": "3.0",
      "stability": "alta",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "flujo_conversacional,densidad_tematica",
      "mihm_equation": "compuesta",
      "sf_pattern": "desalineación-métricas",
      "mihm_note": "Componente del motor cuantitativo MIHM v3.",
      "patterns": [
        "desalineación-métricas",
        "proxy-objetivo"
      ],
      "contentLength": 1533,
      "contentHash": "bd6df19377ab660d"
    },
    {
      "id": "SF_D_NODE_0060",
      "type": "NODE",
      "nodeId": "SF_P_0060",
      "title": "NTI · El sistema se auto-audita",
      "version": "1.0",
      "stability": "alta",
      "contentLength": 3298,
      "contentHash": "dd5b8a7da42bc079"
    },
    {
      "id": "SF_D_NODE_0061",
      "type": "NODE",
      "nodeId": "SF_P_0061",
      "contentLength": 10227,
      "contentHash": "e2efca5f470b3a41"
    },
    {
      "id": "SF_D_NODE_0062",
      "type": "NODE",
      "nodeId": "SF_P_0062",
      "title": "MIHM · Motor de validación",
      "contentLength": 3091,
      "contentHash": "31df4b735f7f6bb4"
    },
    {
      "id": "SF_D_NODE_0063",
      "type": "NODE",
      "nodeId": "SF_P_0063",
      "title": "Catálogo de patrones",
      "version": "1.0",
      "stability": "activo",
      "contentLength": 5133,
      "contentHash": "7f3ba37c281a4a61"
    },
    {
      "id": "SF_D_NODE_0064",
      "type": "NODE",
      "nodeId": "SF_P_0064",
      "title": "Motor de Extracción Multimodal",
      "doc_id": "tech-0064",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Extracción Multimodal procesa texto, datos estructurados, series temporales y metadatos para extraer las señ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1348,
      "contentHash": "ee5bd3cb8133d48e"
    },
    {
      "id": "SF_D_NODE_0065",
      "type": "NODE",
      "nodeId": "SF_P_0065",
      "title": "Analizador Semántico",
      "doc_id": "tech-0065",
      "series": "Arquitectura · Technology",
      "summary": "El Analizador Semántico procesa los datos textuales del sistema para calcular la Métrica de Divergencia Semántica (MDS) ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1316,
      "contentHash": "2f74b252f0f4419d"
    },
    {
      "id": "SF_D_NODE_0066",
      "type": "NODE",
      "nodeId": "SF_P_0066",
      "title": "Analizador Conversacional",
      "doc_id": "tech-0066",
      "series": "Arquitectura · Technology",
      "summary": "El Analizador Conversacional procesa transcripciones, registros y metadatos de conversaciones para detectar patrones de ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1341,
      "contentHash": "0a8dcfd4fb27a309"
    },
    {
      "id": "SF_D_NODE_0067",
      "type": "NODE",
      "nodeId": "SF_P_0067",
      "title": "Motor de Métricas Cognitivas",
      "doc_id": "tech-0067",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Métricas Cognitivas toma las señales extraídas por los analizadores y ejecuta las fórmulas del modelo MIHM p",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1365,
      "contentHash": "c8aee789abdd452d"
    },
    {
      "id": "SF_D_NODE_0068",
      "type": "NODE",
      "nodeId": "SF_P_0068",
      "title": "Motor de Resonancia",
      "doc_id": "tech-0068",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Resonancia detecta la sincronización emergente entre nodos mediante análisis de correlación de series tempor",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1417,
      "contentHash": "5692e32939ee7d59"
    },
    {
      "id": "SF_D_NODE_0069",
      "type": "NODE",
      "nodeId": "SF_P_0069",
      "title": "Motor de Fricción",
      "doc_id": "tech-0069",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Fricción implementa la ecuación central FC(i,j) sobre los datos procesados por los analizadores, produciendo",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1369,
      "contentHash": "2e26a2fa2c555848"
    },
    {
      "id": "SF_D_NODE_0070",
      "type": "NODE",
      "nodeId": "SF_P_0070",
      "title": "Pipeline de Datos Conversacionales",
      "doc_id": "tech-0070",
      "series": "Arquitectura · Technology",
      "summary": "El Pipeline de Datos Conversacionales es la ruta de procesamiento específica para información de texto y conversación de",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1437,
      "contentHash": "9919f96a482f1ab6"
    },
    {
      "id": "SF_D_NODE_0071",
      "type": "NODE",
      "nodeId": "SF_P_0071",
      "title": "Base de Datos Cognitiva",
      "doc_id": "tech-0071",
      "series": "Arquitectura · Technology",
      "summary": "La Base de Datos Cognitiva es la capa de persistencia del ecosistema. Almacena las series temporales de métricas, los ve",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1445,
      "contentHash": "951cc87d2cf06059"
    },
    {
      "id": "SF_D_NODE_0072",
      "type": "NODE",
      "nodeId": "SF_P_0072",
      "title": "API System Friction",
      "doc_id": "tech-0072",
      "series": "Arquitectura · Technology",
      "summary": "La API System Friction es el punto de acceso unificado al ecosistema. Permite al observatorio consultar métricas, a los ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1406,
      "contentHash": "5c9f43b82f54b595"
    },
    {
      "id": "SF_D_NODE_0073",
      "type": "NODE",
      "nodeId": "SF_P_0073",
      "title": "Motor de Inferencia",
      "doc_id": "tech-0073",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Inferencia combina el modelo matemático MIHM con patrones históricos para producir diagnósticos, prediccione",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1436,
      "contentHash": "8717eed3f05888a1"
    },
    {
      "id": "SF_D_NODE_0074",
      "type": "NODE",
      "nodeId": "SF_P_0074",
      "title": "Sistema de Visualización de Grafos",
      "doc_id": "tech-0074",
      "series": "Arquitectura · Technology",
      "summary": "El Sistema de Visualización de Grafos convierte la estructura matemática del grafo del sistema en una representación vis",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1430,
      "contentHash": "b2eb4f730bbefafd"
    },
    {
      "id": "SF_D_NODE_0075",
      "type": "NODE",
      "nodeId": "SF_P_0075",
      "title": "Sistema de Análisis Temporal",
      "doc_id": "tech-0075",
      "series": "Arquitectura · Technology",
      "summary": "El Sistema de Análisis Temporal procesa las series históricas de métricas MIHM para identificar patrones de evolución, s",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1387,
      "contentHash": "0552b196eb291605"
    },
    {
      "id": "SF_D_NODE_0076",
      "type": "NODE",
      "nodeId": "SF_P_0076",
      "title": "Motor de Identificación de Patrones",
      "doc_id": "tech-0076",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Identificación de Patrones usa técnicas de análisis de series temporales y aprendizaje no supervisado para d",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1414,
      "contentHash": "f117537995cf5499"
    },
    {
      "id": "SF_D_NODE_0077",
      "type": "NODE",
      "nodeId": "SF_P_0077",
      "title": "Motor de Clasificación Conversacional",
      "doc_id": "tech-0077",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Clasificación Conversacional categoriza cada intercambio del sistema en tipos de conversación (acuerdo, conf",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1453,
      "contentHash": "160543f973ae3d29"
    },
    {
      "id": "SF_D_NODE_0078",
      "type": "NODE",
      "nodeId": "SF_P_0078",
      "title": "Sistema de Captura Multicanal",
      "doc_id": "tech-0078",
      "series": "Arquitectura · Technology",
      "summary": "El Sistema de Captura Multicanal es la puerta de entrada de datos al pipeline PCV. Conecta con los diferentes canales de",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1404,
      "contentHash": "50b37edc802bcd03"
    },
    {
      "id": "SF_D_NODE_0079",
      "type": "NODE",
      "nodeId": "SF_P_0079",
      "title": "Motor de Modelado Cognitivo",
      "doc_id": "tech-0079",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Modelado Cognitivo traduce los datos crudos de cada nodo institucional en representaciones vectoriales y cam",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1378,
      "contentHash": "fac33348f971d99b"
    },
    {
      "id": "SF_D_NODE_0080",
      "type": "NODE",
      "nodeId": "SF_P_0080",
      "title": "Plataforma Observatorio",
      "doc_id": "tech-0080",
      "series": "Arquitectura · Technology",
      "summary": "La Plataforma Observatorio es la capa tecnológica que integra todos los componentes del pipeline en una interfaz visual ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1413,
      "contentHash": "50a8fa2a9f0651a8"
    },
    {
      "id": "SF_D_NODE_0081",
      "type": "NODE",
      "nodeId": "SF_P_0081",
      "title": "Sistema de Monitoreo de Interacciones",
      "doc_id": "tech-0081",
      "series": "Arquitectura · Technology",
      "summary": "El Sistema de Monitoreo de Interacciones observa de forma continua cómo los nodos del sistema se relacionan entre sí, de",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1409,
      "contentHash": "c90615a7b3e6ce55"
    },
    {
      "id": "SF_D_NODE_0082",
      "type": "NODE",
      "nodeId": "SF_P_0082",
      "title": "Motor de Simulación Social",
      "doc_id": "tech-0082",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Simulación Social implementa la simulación Monte Carlo del ecosistema. Con 50,000 iteraciones por sesión, ge",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1401,
      "contentHash": "54a6a50b6a519a9a"
    },
    {
      "id": "SF_D_NODE_0083",
      "type": "NODE",
      "nodeId": "SF_P_0083",
      "title": "Pipeline Analítico",
      "doc_id": "tech-0083",
      "series": "Arquitectura · Technology",
      "summary": "El Pipeline Analítico es la orquestación de todos los componentes de análisis: define el orden de ejecución, gestiona la",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1386,
      "contentHash": "ed9f901f71c99ecf"
    },
    {
      "id": "SF_D_NODE_0084",
      "type": "NODE",
      "nodeId": "SF_P_0084",
      "title": "Laboratorio MIHM v2.0",
      "contentLength": 19721,
      "contentHash": "f11659cb09a434e5"
    },
    {
      "id": "SF_D_NODE_0085",
      "type": "NODE",
      "nodeId": "SF_P_0085",
      "title": "Plataforma de Investigación",
      "doc_id": "tech-0085",
      "series": "Arquitectura · Technology",
      "summary": "La Plataforma de Investigación (SF Lab) es el entorno beta para investigadores avanzados del sistema. Provee acceso a fu",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1443,
      "contentHash": "56580b1234fc78a3"
    },
    {
      "id": "SF_D_NODE_0086",
      "type": "NODE",
      "nodeId": "SF_P_0086",
      "title": "Sistema de Datos Cognitivos",
      "doc_id": "tech-0086",
      "series": "Arquitectura · Technology",
      "summary": "El Sistema de Datos Cognitivos gestiona específicamente las representaciones computacionales de los modelos cognitivos d",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1436,
      "contentHash": "7d25a35b684b14aa"
    },
    {
      "id": "SF_D_NODE_0087",
      "type": "NODE",
      "nodeId": "SF_P_0087",
      "title": "Motor de Grafos Cognitivos",
      "doc_id": "tech-0087",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Grafos Cognitivos implementa los algoritmos de teoría de grafos necesarios para analizar la topología del si",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1414,
      "contentHash": "5300d47ac72c403f"
    },
    {
      "id": "SF_D_NODE_0088",
      "type": "NODE",
      "nodeId": "SF_P_0088",
      "contentLength": 73485,
      "contentHash": "9e3f0e1f86494f9f"
    },
    {
      "id": "SF_D_NODE_0089",
      "type": "NODE",
      "nodeId": "SF_P_0089",
      "title": "Motor de Aprendizaje Adaptativo",
      "doc_id": "tech-0089",
      "series": "Arquitectura · Technology",
      "summary": "El Motor de Aprendizaje Adaptativo implementa el ciclo de aprendizaje del ecosistema: compara las predicciones del model",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1429,
      "contentHash": "6a5bfc812ee085e3"
    },
    {
      "id": "SF_D_NODE_0090",
      "type": "NODE",
      "nodeId": "SF_P_0090",
      "title": "Infraestructura de Observación",
      "doc_id": "tech-0090",
      "series": "Arquitectura · Technology",
      "summary": "La Infraestructura de Observación es la capa de hosting y operaciones que sostiene todo el ecosistema tecnológico. Aplic",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "pipeline",
      "mihm_equation": "componente técnico",
      "sf_pattern": "coherencia-aparente",
      "mihm_note": "Componente de infraestructura. Estado: implementación activa.",
      "patterns": [
        "coherencia-aparente"
      ],
      "contentLength": 1436,
      "contentHash": "8dbd57a161d31d34"
    },
    {
      "id": "SF_D_NODE_0091",
      "type": "NODE",
      "nodeId": "SF_P_0091",
      "title": "System Friction · Archivo de fricción sistémica",
      "contentLength": 12454,
      "contentHash": "7bf10d738174e3fc"
    },
    {
      "id": "SF_D_NODE_0092",
      "type": "NODE",
      "nodeId": "SF_P_0092",
      "title": "Ontología del Sistema",
      "version": "1.1",
      "stability": "Consolidado",
      "first_published": "2026-02-23",
      "contentLength": 30269,
      "contentHash": "5806436762c6bd54"
    },
    {
      "id": "SF_D_NODE_0093",
      "type": "NODE",
      "nodeId": "SF_P_0093",
      "title": "Mapa Cognitivo Global",
      "doc_id": "obs-0093",
      "series": "Observatorio · Panel",
      "summary": "El Mapa Cognitivo Global es la representación central del observatorio. Muestra los 120 nodos del sistema en layout radi",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1618,
      "contentHash": "ac3b5d1bdb21c53d"
    },
    {
      "id": "SF_D_NODE_0094",
      "type": "NODE",
      "nodeId": "SF_P_0094",
      "title": "Visualizador de Nodos",
      "doc_id": "obs-0094",
      "series": "Observatorio · Panel",
      "summary": "El Visualizador de Nodos es el panel de detalle que se activa al seleccionar un nodo en el Mapa Cognitivo Global. Muestr",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1633,
      "contentHash": "8448fb100f020afb"
    },
    {
      "id": "SF_D_NODE_0095",
      "type": "NODE",
      "nodeId": "SF_P_0095",
      "title": "Explorador de Relaciones",
      "doc_id": "obs-0095",
      "series": "Observatorio · Panel",
      "summary": "El Explorador de Relaciones es la herramienta de análisis de conectividad del observatorio. Permite filtrar, visualizar ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1615,
      "contentHash": "2371428413abbd75"
    },
    {
      "id": "SF_D_NODE_0096",
      "type": "NODE",
      "nodeId": "SF_P_0096",
      "title": "Estado del Sistema · System Friction",
      "contentLength": 24914,
      "contentHash": "dc859dfad6f7ea03"
    },
    {
      "id": "SF_D_NODE_0097",
      "type": "NODE",
      "nodeId": "SF_P_0097",
      "title": "Panel de Resonancia",
      "doc_id": "obs-0097",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Resonancia muestra el mapa de correlaciones entre nodos del sistema, identificando las zonas de alta sincron",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1581,
      "contentHash": "195402cd0764c389"
    },
    {
      "id": "SF_D_NODE_0098",
      "type": "NODE",
      "nodeId": "SF_P_0098",
      "title": "Panel de Fricción",
      "doc_id": "obs-0098",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Fricción es la interfaz visual del Motor de Fricción. Muestra el mapa de gradiente de fricción, los puntos d",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1605,
      "contentHash": "970ed2b1cc89331b"
    },
    {
      "id": "SF_D_NODE_0099",
      "type": "NODE",
      "nodeId": "SF_P_0099",
      "title": "Mapa Temporal de Interacciones",
      "doc_id": "obs-0099",
      "series": "Observatorio · Panel",
      "summary": "El Mapa Temporal de Interacciones convierte las series temporales de datos relacionales en una visualización navegable q",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1644,
      "contentHash": "d46cc7b8573ca9c6"
    },
    {
      "id": "SF_D_NODE_0100",
      "type": "NODE",
      "nodeId": "SF_P_0100",
      "title": "Analizador de Conversaciones",
      "doc_id": "obs-0100",
      "series": "Observatorio · Panel",
      "summary": "El Analizador de Conversaciones (panel del observatorio) presenta de forma visual los resultados del Analizador Conversa",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1645,
      "contentHash": "10c79dcbc2420a72"
    },
    {
      "id": "SF_D_NODE_0101",
      "type": "NODE",
      "nodeId": "SF_P_0101",
      "title": "Panel de Sincronización Cognitiva",
      "doc_id": "obs-0101",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Sincronización Cognitiva muestra el ISC del sistema y su descomposición en sus componentes temporal y semánt",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1641,
      "contentHash": "588a8838067dec41"
    },
    {
      "id": "SF_D_NODE_0102",
      "type": "NODE",
      "nodeId": "SF_P_0102",
      "title": "Visualizador de Campos Semánticos",
      "doc_id": "obs-0102",
      "series": "Observatorio · Panel",
      "summary": "El Visualizador de Campos Semánticos renderiza el modelo de campo semántico como una topografía visual: zonas de alta de",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1664,
      "contentHash": "e731c1d75b466a69"
    },
    {
      "id": "SF_D_NODE_0103",
      "type": "NODE",
      "nodeId": "SF_P_0103",
      "title": "Motor de Navegación Cognitiva",
      "doc_id": "obs-0103",
      "series": "Observatorio · Panel",
      "summary": "El Motor de Navegación Cognitiva es la guía inteligente del observatorio. Sugiere qué nodos explorar, qué relaciones inv",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1667,
      "contentHash": "31541feed21034ad"
    },
    {
      "id": "SF_D_NODE_0104",
      "type": "NODE",
      "nodeId": "SF_P_0104",
      "title": "Panel de Densidad Relacional",
      "doc_id": "obs-0104",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Densidad Relacional muestra la distribución de MDI en el grafo del sistema: qué nodos están en zona óptima, ",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1606,
      "contentHash": "42a5acc8604cd31c"
    },
    {
      "id": "SF_D_NODE_0105",
      "type": "NODE",
      "nodeId": "SF_P_0105",
      "title": "Mapa de Gradientes Cognitivos",
      "doc_id": "obs-0105",
      "series": "Observatorio · Panel",
      "summary": "El Mapa de Gradientes Cognitivos es la representación visual del campo de vectores del gradiente de fricción: muestra la",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1658,
      "contentHash": "8405dae54e3679ad"
    },
    {
      "id": "SF_D_NODE_0106",
      "type": "NODE",
      "nodeId": "SF_P_0106",
      "title": "Explorador de Clústeres",
      "doc_id": "obs-0106",
      "series": "Observatorio · Panel",
      "summary": "El Explorador de Clústeres permite analizar el sistema a nivel de clúster: el estado agregado de cada grupo de nodos, la",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1615,
      "contentHash": "88766b665a23538e"
    },
    {
      "id": "SF_D_NODE_0107",
      "type": "NODE",
      "nodeId": "SF_P_0107",
      "title": "Mapa de Sistemas Sociales",
      "doc_id": "obs-0107",
      "series": "Observatorio · Panel",
      "summary": "El Mapa de Sistemas Sociales complementa el Mapa Cognitivo Global con información sobre la estructura social del sistema",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1635,
      "contentHash": "3c51fd353b957135"
    },
    {
      "id": "SF_D_NODE_0108",
      "type": "NODE",
      "nodeId": "SF_P_0108",
      "title": "Panel de Ruido Cognitivo",
      "doc_id": "obs-0108",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Ruido Cognitivo muestra la MRC del sistema, las principales fuentes de ruido identificadas y su impacto sobr",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1593,
      "contentHash": "55d1cfd492bf41b9"
    },
    {
      "id": "SF_D_NODE_0109",
      "type": "NODE",
      "nodeId": "SF_P_0109",
      "title": "Panel de Coherencia Conversacional",
      "doc_id": "obs-0109",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Coherencia Conversacional visualiza el ICC del sistema, la distribución de coherencia entre nodos y los patr",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1645,
      "contentHash": "a0a7bb44478e65ce"
    },
    {
      "id": "SF_D_NODE_0110",
      "type": "NODE",
      "nodeId": "SF_P_0110",
      "title": "Panel de Energía Relacional",
      "doc_id": "obs-0110",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Energía Relacional muestra el estado del balance energético de las relaciones del sistema: qué vínculos tien",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1640,
      "contentHash": "b8da7848bce9f3d3"
    },
    {
      "id": "SF_D_NODE_0111",
      "type": "NODE",
      "nodeId": "SF_P_0111",
      "title": "Mapa de Interacciones Humanas",
      "doc_id": "obs-0111",
      "series": "Observatorio · Panel",
      "summary": "El Mapa de Interacciones Humanas es la capa del observatorio más cercana a los datos empíricos: muestra los patrones rea",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1625,
      "contentHash": "cab2677b2f0d1505"
    },
    {
      "id": "SF_D_NODE_0112",
      "type": "NODE",
      "nodeId": "SF_P_0112",
      "title": "Visualizador Multinivel",
      "doc_id": "obs-0112",
      "series": "Observatorio · Panel",
      "summary": "El Visualizador Multinivel implementa la navegación multi-escala del observatorio: el operador puede moverse fluidamente",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1643,
      "contentHash": "1f75cd274d5010ea"
    },
    {
      "id": "SF_D_NODE_0113",
      "type": "NODE",
      "nodeId": "SF_P_0113",
      "title": "Explorador de Campos Cognitivos",
      "doc_id": "obs-0113",
      "series": "Observatorio · Panel",
      "summary": "El Explorador de Campos Cognitivos permite al operador visualizar, comparar y analizar los modelos de campo cognitivo de",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1665,
      "contentHash": "ab45258cc2b2861f"
    },
    {
      "id": "SF_D_NODE_0114",
      "type": "NODE",
      "nodeId": "SF_P_0114",
      "title": "Panel de Divergencia Semántica",
      "doc_id": "obs-0114",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Divergencia Semántica muestra el mapa de MDS del sistema, identificando los pares de nodos con mayor diverge",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1621,
      "contentHash": "5208e434eb5fd318"
    },
    {
      "id": "SF_D_NODE_0115",
      "type": "NODE",
      "nodeId": "SF_P_0115",
      "title": "Mapa de Resonancia Social",
      "doc_id": "obs-0115",
      "series": "Observatorio · Panel",
      "summary": "El Mapa de Resonancia Social combina la MR con el análisis de campo social para mostrar dónde hay resonancias activas, q",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1652,
      "contentHash": "786b36b2c42fe316"
    },
    {
      "id": "SF_D_NODE_0116",
      "type": "NODE",
      "nodeId": "SF_P_0116",
      "title": "Panel de Equilibrio Sistémico",
      "doc_id": "obs-0116",
      "series": "Observatorio · Panel",
      "summary": "El Panel de Equilibrio Sistémico es la vista de más alto nivel del observatorio: muestra el IES del sistema, su posición",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1611,
      "contentHash": "fb6f4f5db522f93e"
    },
    {
      "id": "SF_D_NODE_0117",
      "type": "NODE",
      "nodeId": "SF_P_0117",
      "title": "Mapa de Latencia Conversacional",
      "doc_id": "obs-0117",
      "series": "Observatorio · Panel",
      "summary": "El Mapa de Latencia Conversacional muestra la distribución de LC y LDI en el grafo del sistema: qué vínculos tienen alta",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1667,
      "contentHash": "b4a4e66b4bf89282"
    },
    {
      "id": "SF_D_NODE_0118",
      "type": "NODE",
      "nodeId": "SF_P_0118",
      "contentLength": 4723,
      "contentHash": "34562281f3a38665"
    },
    {
      "id": "SF_D_NODE_0119",
      "type": "NODE",
      "nodeId": "SF_P_0119",
      "title": "Mapa de Transferencia Semántica",
      "doc_id": "obs-0119",
      "series": "Observatorio · Panel",
      "summary": "El Mapa de Transferencia Semántica muestra cómo fluye el significado a través del sistema institucional: qué rutas tiene",
      "version": "3.0",
      "stability": "activo",
      "first_published": "2026-03-20",
      "node": "docs",
      "mihm_variable": "visualizacion",
      "mihm_equation": "panel de observacion",
      "sf_pattern": "alerta-ignorada",
      "mihm_note": "Panel de visualización del observatorio. Lectura en tiempo real.",
      "patterns": [
        "alerta-ignorada",
        "señal-ruido"
      ],
      "contentLength": 1647,
      "contentHash": "c71272331482d54d"
    }
  ],
  "diagnostics": {
    "source_nodes_file": "SF_nodes(2).json",
    "source_docs_file": "SF_docs(1).js",
    "parsed_nodes": 121,
    "parsed_edges": 377,
    "parsed_docs_from_js": 117,
    "declared_total_documents": 121,
    "declared_documents_supplement": 94,
    "note": "JS supplement parsed as DOCS_V3 object; compact dataset stores frontmatter/metadata, not full document content."
  }
} as const;

export type SfStaticDataset = typeof sfStaticDataset;
