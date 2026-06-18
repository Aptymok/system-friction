const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';

async function post(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

const noObject = await post('/api/scorefriction/operational-cycle', {
  case_id: 'qa-no-object',
  objective: 'solo lectura mundo',
  scope: 'culture',
  analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
  run_contrast: false,
});

const withObject = await post('/api/scorefriction/operational-cycle', {
  case_id: 'qa-with-object',
  objective: 'evaluar objeto cultural',
  scope: 'culture',
  analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
  evaluated_object: 'archivo vivo senal cultural recurrente con retorno simbolico',
  user_question: 'conviene publicarlo?',
  run_contrast: true,
});

const failures = [];
const noState = noObject.json.state ?? {};
const objState = withObject.json.state ?? {};
const noExp = noState.recommended_experiments?.[0] ?? {};
const objExp = objState.recommended_experiments?.[0] ?? {};

if (noObject.status !== 200 || noObject.json.ok !== true) failures.push('no_object_request_failed');
if (noState.object_presence !== 'missing') failures.push('no_object_presence_not_missing');
if (noState.mihm?.available !== false) failures.push('mihm_should_not_be_available_without_object');
if (noState.psi?.available !== false) failures.push('psi_should_not_be_available_without_object');
if (noState.scorefriction?.available !== false) failures.push('scorefriction_should_not_be_available_without_object');
if (noExp.status !== 'blocked_no_object') failures.push('no_object_experiment_not_blocked');
if (!String(noExp.plain_language ?? '').toLowerCase().includes('no puedo')) failures.push('no_object_plain_language_not_clear');

if (withObject.status !== 200 || withObject.json.ok !== true) failures.push('with_object_request_failed');
if (objState.object_presence !== 'provided') failures.push('object_presence_not_provided');
if (objState.mihm?.available !== true) failures.push('mihm_not_available_with_object');
if (objState.psi?.available !== true) failures.push('psi_not_available_with_object');
if (objState.scorefriction?.available !== true) failures.push('scorefriction_not_available_with_object');
if (!objState.world_context?.summary) failures.push('world_context_missing');
if (!objState.formal_report?.markdown || objState.formal_report.markdown.length < 1200) failures.push('formal_report_missing_or_short');
if (!objExp.action || objExp.status === 'blocked_no_object') failures.push('object_experiment_not_generated');

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  no_object: {
    object_presence: noState.object_presence,
    mihm_available: noState.mihm?.available,
    experiment_status: noExp.status,
    answer: noState.amv_answer?.answer,
  },
  with_object: {
    object_presence: objState.object_presence,
    mihm: objState.mihm,
    psi: objState.psi,
    scorefriction: objState.scorefriction,
    experiment: objExp,
    reportLength: objState.formal_report?.markdown?.length ?? 0,
  },
}, null, 2));

process.exit(failures.length ? 1 : 0);