"""
app.py – Servidor central de System Friction v4.1
Motor: MIHM + MCM-A + Campo de Frecuencia Colectiva (CFF)

Principio: mihm es la única instancia compartida.
Todos los módulos reciben mihm por inyección de dependencia.
Ningún endpoint modifica mihm.state directamente –
solo a través de apply_delta().
"""

import os
import uuid
import requests
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np

from config import Config
from database import Database
from groq_client import GroqClient
from audio_features import extract_features
from mihm import MIHM

# ── Módulos del framework System Friction ────────────────────────────
from modules.social_analyzer          import SocialAnalyzer
from modules.audio_analyzer_advanced  import AudioAnalyzerAdvanced
from modules.scraping_spotify         import SpotifyScraper
from modules.project_proposals        import ProjectProposals
from modules.marketing_engine         import MarketingEngine
from modules.project_manager          import ProjectManager
from modules.ml_friction              import MLFriction
from modules.integrations             import Integrations
from modules.reflexive_engine         import ReflexiveEngine
from modules.frequency_coexistence    import FrequencyCoexistenceEngine

# ══════════════════════════════════════════════════════════════════════
# INICIALIZACIÓN CENTRAL
# ══════════════════════════════════════════════════════════════════════

app  = Flask(__name__)
app.config.from_object(Config)
CORS(app)

db   = Database('instance/friction.db')
groq = GroqClient()
mihm = MIHM()
db   = Database('instance/friction.db')
groq = GroqClient()
mihm = MIHM()

# Inyectar groq en MIHM para meta_control → propose_new_rule_via_groq
# Inyectar groq en MIHM para meta_control → propose_new_rule_via_groq
mihm._groq = groq

# Cargar parámetros persistidos
# Cargar parámetros persistidos
saved_params = db.get_parameters('mihm_params')
if saved_params:
    mihm.params.update(saved_params)

# ── Instanciar módulos con mihm compartido ───────────────────────────
social    = SocialAnalyzer(mihm)
audio_adv = AudioAnalyzerAdvanced(mihm)
spotify   = SpotifyScraper(mihm)
proposals = ProjectProposals(mihm, groq)
marketing = MarketingEngine(mihm)
pm        = ProjectManager(mihm)
ml        = MLFriction(mihm)
integs    = Integrations(mihm)
reflexive = ReflexiveEngine(mihm)
freq_coex = FrequencyCoexistenceEngine(mihm, groq)


def gen_id() -> str:
    return str(uuid.uuid4())


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS CORE
# ══════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status':    'SF-CORE online',
        'version':   '4.1-CFF',
        'engine':    'MIHM Personal',
        'endpoints': ['/health', '/predict', '/learn', '/history', '/api/metrics', '/api/commits', '/api/llm/narrative'],
    }), 200


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':  'ok',
        'version': '4.1-CFF',
        'mihm':    'active',
        'state':   mihm.state,
        'cost_j':  mihm.cost_function(),
        'irc':     mihm.irc,
    })


@app.route('/predict', methods=['POST'])
def predict():
    mihm.process_delayed_updates()
    data = request.get_json()
    user = data.get('user', 'anon')
    text = data.get('text', '')

    ihg = data.get('ihg', mihm.state['ihg'])
    nti = data.get('nti', mihm.state['nti'])
    r   = data.get('r',   mihm.state['r'])

    delta = {
        'ihg': ihg - mihm.state['ihg'],
        'nti': nti - mihm.state['nti'],
        'r':   r   - mihm.state['r'],
    }
    u, J = mihm.apply_delta(delta, action=f"predict:{user}")
    mihm.meta_control()

    proyeccion = mihm.monte_carlo_projection()
    stability  = mihm.stability_analysis()

    ihg_v = mihm.state['ihg']
    if ihg_v < -1.2:
        intervencion = "CRITICO: Hegemonía extrema. Se requiere redistribución de decisiones."
    elif ihg_v < -0.8:
        intervencion = "ALERTA: Alta concentración de poder. Revisar roles."
    elif ihg_v < -0.4:
        intervencion = "TENSION: Equilibrio inestable. Monitorear flujo de decisiones."
    else:
        intervencion = "ESTABLE: La homeostasis está dentro de rangos aceptables."

    pred_id = gen_id()
    db.save_prediction(pred_id, user, text, mihm.state)
    db.save_state(mihm.state, mihm.irc, f"predict:{user}", J)

    return jsonify({
        'prediction_id': pred_id,
        'state':         mihm.state,
        'intervencion':  intervencion,
        'control': {
            'u':  u,
            'kp': mihm.params['kp'],
            'ki': mihm.params['ki'],
            'kd': mihm.params['kd'],
        },
        'stability':  stability,
        'proyeccion': proyeccion,
        'cost_j':     J,
        'irc':        mihm.irc,
    })


@app.route('/learn', methods=['POST'])
def learn():
    mihm.process_delayed_updates()
    data    = request.get_json()
    pred_id = data.get('prediction_id')
    outcome = data.get('outcome')
    if not pred_id or outcome is None:
        return jsonify({'error': 'Missing prediction_id or outcome'}), 400

    error          = outcome - mihm.state['ihg']
    error_smoothed = 0.7 * error + 0.3 * (db.get_parameters('last_error') or 0)
    db.save_parameters('last_error', error_smoothed)
    new_params = mihm.learn(pred_id, outcome, db)

    with db.get_connection() as conn:
        conn.execute(
            'UPDATE predictions SET error=?, error_smoothed=? WHERE prediction_id=?',
            (error, error_smoothed, pred_id),
        )

    return jsonify({
        'error':          error,
        'error_smoothed': error_smoothed,
        'new_params':     new_params,
    })


@app.route('/history', methods=['GET'])
def history():
    limit = request.args.get('limit', 100, type=int)
    return jsonify({'history': db.get_history(limit)})


@app.route('/reset', methods=['POST'])
def reset():
    mihm.state = {
        'ihg':        -0.620,
        'nti':         0.351,
        'r':           0.450,
        'phi_p':       0.000,
        'psi_i':       0.000,
        'h_scale':     0.500,
        'ml_success':  0.500,
        'cff':         0.000,
    }
    mihm.integral   = 0.0
    mihm.prev_error = 0.0
    mihm.irc        = 0.38
    return jsonify({'status': 'reset', 'state': mihm.state})


@app.route('/groq/analyze', methods=['POST'])
def groq_analyze():
    mihm.process_delayed_updates()
    data      = request.get_json()
    responses = data.get('responses', '')
    if not responses:
        return jsonify({'error': 'No responses provided'}), 400
    try:
        result = groq.analyze_audit(responses)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/scenario/select', methods=['POST'])
def scenario_select():
    data = request.get_json()
    db.save_scenario(data.get('scenario'))
    return jsonify({'status': 'registered'})


@app.route('/export', methods=['GET'])
def export():
    with db.get_connection() as conn:
        cur  = conn.execute('SELECT * FROM predictions ORDER BY timestamp')
        data = [dict(row) for row in cur.fetchall()]
    return jsonify(data)


@app.route('/midi/generate', methods=['POST'])
def generate_midi_route():
    mihm.process_delayed_updates()
    data      = request.get_json()
    num_inst  = data.get('num_instruments', 4)
    phonemes  = data.get('phoneme_pattern', None)
    midi_file = mihm.generate_midi(num_inst, phonemes)
    return send_file(midi_file, as_attachment=True)


# ══════════════════════════════════════════════════════════════════════
# AUDIO
# ══════════════════════════════════════════════════════════════════════

@app.route('/audio/analyze', methods=['POST'])
def audio_analyze():
    mihm.process_delayed_updates()
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files uploaded'}), 400

    results = []
    for file in files:
        filename    = file.filename
        audio_bytes = file.read()
        features    = extract_features(audio_bytes, filename)

        # Análisis avanzado con acoplamiento MIHM
        adv = audio_adv.analyze(features)

        # Coexistencia social de frecuencias
        coex = freq_coex.analyze(features)

        # Narrativa Groq
        analysis = groq.analyze_audio(features)

        results.append({
            'filename':   filename,
            'features':   features,
            'analysis':   analysis,
            'advanced':   adv,
            'coexistence': coex,
        })

    return jsonify({
        'results':    results,
        'mihm_state': mihm.state,
        'cost_j':     mihm.cost_function(),
        'irc':        mihm.irc,
    })


# ══════════════════════════════════════════════════════════════════════
# FRECUENCIAS – Coexistencia Social
# ══════════════════════════════════════════════════════════════════════

@app.route('/frequency/analyze', methods=['POST'])
def frequency_analyze():
    """
    Análisis de coexistencia social-frecuencia.
    Body: { "features": {...}, "social_context": {...} }
    """
    mihm.process_delayed_updates()
    data           = request.get_json() or {}
    features       = data.get('features', {})
    social_context = data.get('social_context', {})

    if not features:
        # Si no vienen features, usar valores neutros
        features = {
            'band_energy_low':   0.33,
            'band_energy_mid':   0.33,
            'band_energy_high':  0.33,
            'onset_density':     2.0,
            'spectral_entropy':  5.0,
            'dynamic_range':     60.0,
            'periodicity':       0.3,
        }

    result = freq_coex.analyze(features, social_context)
    db.save_state(mihm.state, mihm.irc, "frequency_analyze", mihm.cost_function())
    return jsonify(result)


@app.route('/frequency/ritual', methods=['POST'])
def frequency_ritual():
    """
    Propone un ritual de apertura de sesión.
    Body: { "group_size": int, "diversity_index": float, "setting": str }
    """
    mihm.process_delayed_updates()
    data       = request.get_json() or {}
    group_size = int(data.get('group_size', 10))
    diversity  = float(data.get('diversity_index', 0.5))
    setting    = data.get('setting', 'studio')

    result = freq_coex.propose_session_ritual(group_size, diversity, setting)
    db.save_state(mihm.state, mihm.irc, "frequency_ritual", mihm.cost_function())
    return jsonify(result)


@app.route('/frequency/map', methods=['GET'])
def frequency_map():
    """Mapa completo de bandas frecuenciales y zonas sociales."""
    return jsonify(freq_coex.get_frequency_map())


@app.route('/frequency/history', methods=['GET'])
def frequency_history():
    """Historial de análisis de coexistencia de la sesión."""
    limit  = request.args.get('limit', 20, type=int)
    return jsonify({'history': freq_coex.get_session_history(limit)})


# ══════════════════════════════════════════════════════════════════════
# SOCIAL
# ══════════════════════════════════════════════════════════════════════

@app.route('/social/analyze', methods=['POST'])
def analyze_social():
    mihm.process_delayed_updates()
    data  = request.get_json()
    query = data.get('query', '')
    if not query:
        return jsonify({'error': 'Missing query'}), 400
    return jsonify(social.analyze_social(query))


# ══════════════════════════════════════════════════════════════════════
# SPOTIFY / TIKTOK
# ══════════════════════════════════════════════════════════════════════

@app.route('/spotify/trends', methods=['GET'])
def spotify_trends():
    mihm.process_delayed_updates()
    genre = request.args.get('genre', 'reggaeton')
    limit = request.args.get('limit', 20, type=int)
    return jsonify(spotify.analyze_trends(genre, limit))


@app.route('/tiktok/scrape', methods=['GET'])
def tiktok_scrape():
    mihm.process_delayed_updates()
    query = request.args.get('query', 'viral')
    return jsonify(social.analyze_social(query))


# ══════════════════════════════════════════════════════════════════════
# PROYECTOS / MARKETING / PM
# ══════════════════════════════════════════════════════════════════════

@app.route('/projects/propose', methods=['POST'])
def projects_propose():
    mihm.process_delayed_updates()
    data = request.get_json() or {}
    return jsonify(proposals.generate(data))


@app.route('/marketing/campaign', methods=['POST'])
def marketing_campaign():
    mihm.process_delayed_updates()
    data         = request.get_json()
    release_name = data.get('release_name', 'Untitled')
    budget       = float(data.get('budget', 1000.0))
    channels     = data.get('channels', ['tiktok', 'instagram', 'spotify'])
    return jsonify(marketing.plan_campaign(release_name, budget, channels))


@app.route('/pm/project', methods=['POST'])
def pm_create():
    mihm.process_delayed_updates()
    data     = request.get_json()
    name     = data.get('name', 'Proyecto sin nombre')
    members  = data.get('members', [])
    deadline = int(data.get('deadline_days', 30))
    return jsonify(pm.create_project(name, members, deadline))


@app.route('/pm/task', methods=['POST'])
def pm_task():
    mihm.process_delayed_updates()
    data       = request.get_json()
    project_id = data.get('project_id', '')
    task       = data.get('task', '')
    done       = bool(data.get('done', False))
    return jsonify(pm.update_task(project_id, task, done))


@app.route('/pm/projects', methods=['GET'])
def pm_list():
    return jsonify({'projects': pm.list_projects()})


# ══════════════════════════════════════════════════════════════════════
# ML
# ══════════════════════════════════════════════════════════════════════

@app.route('/ml/predict', methods=['POST'])
def ml_predict():
    mihm.process_delayed_updates()
    data = request.get_json()
    return jsonify(ml.predict_success(data.get('features', {})))


@app.route('/ml/train', methods=['POST'])
def ml_train():
    mihm.process_delayed_updates()
    data         = request.get_json()
    features     = data.get('features', {})
    true_outcome = float(data.get('true_outcome', 0.5))
    return jsonify(ml.train(features, true_outcome))


# ══════════════════════════════════════════════════════════════════════
# INTEGRACIONES
# ══════════════════════════════════════════════════════════════════════

@app.route('/integrations/youtube', methods=['POST'])
def int_youtube():
    mihm.process_delayed_updates()
    data = request.get_json()
    return jsonify(integs.ingest_youtube_analytics(
        data.get('video_id', ''), data.get('metrics', {})))


@app.route('/integrations/soundcloud', methods=['POST'])
def int_soundcloud():
    mihm.process_delayed_updates()
    data = request.get_json()
    return jsonify(integs.ingest_soundcloud(
        data.get('track_id', ''),
        int(data.get('plays', 0)),
        int(data.get('reposts', 0)),
    ))


@app.route('/integrations/generic', methods=['POST'])
def int_generic():
    mihm.process_delayed_updates()
    data = request.get_json()
    return jsonify(integs.ingest_generic(
        data.get('platform', 'unknown'),
        data.get('signal_name', 'generic'),
        float(data.get('value', 0.5)),
        float(data.get('weight', 0.1)),
    ))


# ══════════════════════════════════════════════════════════════════════
# SISTEMA REFLEXIVO (MCM-A)
# ══════════════════════════════════════════════════════════════════════

@app.route('/system/health', methods=['GET'])
def system_health():
    mihm.process_delayed_updates()
    mihm.meta_control()
    result = reflexive.evaluate_system_health()
    db.save_state(mihm.state, mihm.irc, "system_health_check", mihm.cost_function())
    return jsonify(result)


@app.route('/system/meta_control', methods=['POST'])
def force_meta_control():
    mihm.process_delayed_updates()
    result = reflexive.force_meta_control()
    db.save_state(mihm.state, mihm.irc, "forced_meta_control", mihm.cost_function())
    return jsonify(result)


@app.route('/system/history', methods=['GET'])
def state_history():
    limit = request.args.get('limit', 200, type=int)
    rows  = db.get_state_history(limit)
    return jsonify({'state_history': rows, 'count': len(rows)})


@app.route('/system/rules', methods=['GET'])
def reflexive_rules():
    rows = db.get_reflexive_rules(50)
    return jsonify({
        'rules':      rows,
        'live_rules': mihm.reflexive_rules[-10:],
    })


@app.route('/system/state', methods=['GET'])
def system_state():
    mihm.process_delayed_updates()
    return jsonify({
        'state':           mihm.state,
        'irc':             mihm.irc,
        'meta_j':          mihm.compute_meta_j(),
        'cost_j':          mihm.cost_function(),
        'params':          mihm.params,
        'history_size':    len(mihm.history),
        'delayed_queue':   len(mihm.delayed_updates),
        'reflexive_rules': len(mihm.reflexive_rules),
        'timestamp':       datetime.utcnow().isoformat(),
    })


# ══════════════════════════════════════════════════════════════════════
# API PÚBLICA — métricas, commits, narrativa LLM
# ══════════════════════════════════════════════════════════════════════

@app.route('/api/metrics', methods=['POST'])
def api_save_metrics():
    data  = request.get_json(silent=True) or {}
    m     = data.get('mihm', {})
    delta = {'ihg': m.get('IHG', 0) - mihm.state['ihg'],
             'nti': m.get('NTI', 0) - mihm.state['nti'],
             'r':   m.get('R',   0) - mihm.state['r']}
    mihm.apply_delta(delta, action='api:metrics')
    db.save_state(mihm.state, mihm.irc, 'api:metrics', mihm.cost_function())
    return jsonify({'saved': True, 'ts': datetime.utcnow().isoformat()}), 200


@app.route('/api/metrics', methods=['GET'])
def api_get_metrics():
    limit = request.args.get('limit', 50, type=int)
    return jsonify({'history': db.get_history(limit)}), 200


@app.route('/api/commits', methods=['GET'])
def api_commits():
    token   = os.environ.get('GITHUB_TOKEN', '')
    headers = {'Accept': 'application/vnd.github.v3+json'}
    if token:
        headers['Authorization'] = f'token {token}'
    try:
        resp = requests.get(
            'https://api.github.com/repos/Aptymok/system-friction/commits?per_page=10',
            headers=headers, timeout=6)
        data = resp.json()
        commits = [{
            'sha':     c.get('sha','')[:7],
            'message': c.get('commit',{}).get('message','').split('\n')[0],
            'author':  c.get('commit',{}).get('author',{}).get('name',''),
            'date':    c.get('commit',{}).get('author',{}).get('date',''),
        } for c in data if isinstance(c, dict)] if isinstance(data, list) else []
        return jsonify({'commits': commits, 'count': len(commits)}), 200
    except Exception as e:
        return jsonify({'commits': [], 'count': 0, 'error': str(e)}), 200


@app.route('/api/llm/narrative', methods=['POST'])
def api_llm_narrative():
    data      = request.get_json(silent=True) or {}
    user_text = data.get('text', '')
    context   = data.get('context', '')
    mihm_in   = data.get('mihm', {})

    ihg = mihm_in.get('IHG', mihm.state.get('ihg', 0))
    nti = mihm_in.get('NTI', mihm.state.get('nti', 0))
    r   = mihm_in.get('R',   mihm.state.get('r',   0))
    st  = mihm_in.get('status', 'OK')

    personal = f'\nContexto personal: {context}' if context else ''
    prompt = (
        f'Eres Eidolón, asistente de autoconocimiento cognitivo.\n'
        f'Estado MIHM: IHG={ihg:.2f} NTI={nti:.2f} R={r:.2f} Estado={st}{personal}\n'
        f'Usuario: {user_text}\n'
        f'Responde en español, máximo 3 oraciones, integrando los datos de forma natural.'
    )

    try:
        result = groq.raw_completion(prompt, max_tokens=220)
        return jsonify({'narrative': result, 'source': 'groq'}), 200
    except Exception as e:
        # Fallback local
        if st == 'CRITICAL' or st == 'COLLAPSE':
            txt = f'Estado {st}: IHG={ihg:.2f}. La tensión ({nti:.2f}) supera la resiliencia ({r:.2f}).'
        else:
            txt = f'IHG={ihg:.2f}, R={r:.2f}. {"Tensión elevada." if nti > 0.5 else "Sistema estable."}'
        return jsonify({'narrative': txt, 'source': 'local', 'error': str(e)}), 200


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
