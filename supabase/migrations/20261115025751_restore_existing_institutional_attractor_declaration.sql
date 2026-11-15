-- Reconcile missing DECLARED target from the previously approved canonical
-- declaration in 20260807133000_sfi_institutional_attractor_trajectory.sql.
-- Idempotent recovery. No empirical attainment is asserted and no trajectories
-- or unrelated attractors are modified.
INSERT INTO public.graph_nodes
(node_key,label,node_type,profile,origin,epistemic_class,confidence,payload,ontology_type,lineage,attributes)
VALUES
('SFI-INSTITUTION','System Friction Institute','INST','institution','SFI_INSTITUTIONAL_ATTRACTOR','declared',0,
 jsonb_build_object('description','Institutional subject: declared direction, not observed attainment.',
 'declaration',jsonb_build_object('epistemicClass','DECLARED','authority','FOUNDER',
 'desiredState','Que System Friction Institute alcance autoridad y reconocimiento internacional sobre la observación y reorganización de ecosistemas digitales, biológicos y ontológicos, sosteniendo investigación y actividad comercial persistentes mediante instrumentos de perturbación mínima y gobernanza.')),
 'institution',ARRAY[]::text[],jsonb_build_object('status','active','module','institution','authority','FOUNDER'))
ON CONFLICT(node_key) DO NOTHING;

INSERT INTO public.sfi_attractors
(attractor_key,label,module,owner_node_key,attractor_type,status,vector)
VALUES ('SFI-INSTITUTIONAL-ATTRACTOR-001','Reorganización contextual persistente','institution','SFI-INSTITUTION','declared_institutional','declared',
 jsonb_build_object(
 'epistemicClass','DECLARED','authoritySource','FOUNDER','declarationRecorded',true,
 'declaredAt','2026-08-07T13:30:00Z',
 'desiredState','Que System Friction Institute alcance autoridad y reconocimiento internacional sobre la observación y reorganización de ecosistemas digitales, biológicos y ontológicos, sosteniendo investigación y actividad comercial persistentes mediante instrumentos de perturbación mínima y gobernanza.',
 'mechanism','Observar antes de inferir; contrastar evidencia; detectar trayectorias y atractores; proponer perturbaciones mínimas reversibles; gobernar acciones de mayor autoridad; registrar retornos y aprender sin imponer una solución única.',
 'normativePosition','SFI no presume neutralidad: declara dirección, límites, autoridad y criterios de evidencia, pero no sustituye la agencia del sistema observado.',
 'claimBoundary','El reconocimiento, adopción, ventas y alcance internacional sólo se consideran observados cuando existe evidencia externa o transaccional persistida. La declaración del fundador constituye dirección, no logro.',
 'dimensions',jsonb_build_array('research_persistence','instrument_adoption','commercial_persistence','external_recognition','domain_breadth','minimal_perturbation_governance','institutional_continuity'),
 'reconstructionSource','supabase/migrations/20260807133000_sfi_institutional_attractor_trajectory.sql',
 'reconstructionClass','DECLARED_RECOVERY_NOT_EMPIRICAL_EVIDENCE',
 'recoveredAt',now(),
 'confidenceSemantics','Numeric defaults are technical declaration fields, not observed attainment'
 ))
ON CONFLICT(attractor_key) DO NOTHING;
