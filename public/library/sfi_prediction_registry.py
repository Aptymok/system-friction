from datetime import datetime, timezone
import json
from pathlib import Path

PREDICTIONS_FILE = Path("sfi_prediction_registry.json")

SCHEMA = {
  "case_id": "",
  "hypothesis_id": "",
  "case_label": "",
  "operator_mode": "",
  "fenotipo_estimado": "",
  "ep_estado_inicial": "",
  "ssp_esperada": "",
  "ssp_observada": "",
  "perturbacion_tipo": "",
  "perturbacion_aplicada": "",
  "prediccion_explicita": "",
  "probabilidad_estimativa": null,
  "friccion_respuesta_campo": "",
  "resultado_72h": "",
  "resultado_7d": "",
  "resultado_30d": "",
  "resultado_90d": "",
  "ep_t_registrada": "",
  "cp_dias": null,
  "fallo_hipotesis": "",
  "refinamiento": "",
  "estado_observacion": "pendiente",
  "created_at": "",
  "updated_at": ""
}

REQUIRED = ["case_id","hypothesis_id","fenotipo_estimado","ep_estado_inicial","ssp_esperada","perturbacion_tipo","perturbacion_aplicada","prediccion_explicita","probabilidad_estimativa"]

def utc_now():
    return datetime.now(timezone.utc).isoformat()

def load_predictions(path=PREDICTIONS_FILE):
    if Path(path).exists():
        return json.loads(Path(path).read_text(encoding="utf-8"))
    return []

def save_predictions(records, path=PREDICTIONS_FILE):
    Path(path).write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

def record_prediction(prediction_data, path=PREDICTIONS_FILE):
    missing = [field for field in REQUIRED if prediction_data.get(field) in (None, "")]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")
    records = load_predictions(path)
    record = SCHEMA.copy()
    record.update(prediction_data)
    record["created_at"] = utc_now()
    record["updated_at"] = record["created_at"]
    record["estado_observacion"] = "registrada_pre_perturbacion"
    records.append(record)
    save_predictions(records, path)
    return record

def update_prediction_result(hypothesis_id, updates, path=PREDICTIONS_FILE):
    records = load_predictions(path)
    for record in records:
        if record.get("hypothesis_id") == hypothesis_id:
            record.update(updates)
            record["updated_at"] = utc_now()
            save_predictions(records, path)
            return record
    raise ValueError(f"Hypothesis not found: {hypothesis_id}")

if __name__ == "__main__":
    sample = {
        "case_id":"FF-000",
        "hypothesis_id":"H-MOP-000",
        "fenotipo_estimado":"FP-000 · Sample",
        "ep_estado_inicial":"Activation",
        "ssp_esperada":"Somatic",
        "perturbacion_tipo":"Prospective",
        "perturbacion_aplicada":"Question of the island",
        "prediccion_explicita":"A verbalized action will emerge within 72h.",
        "probabilidad_estimativa":0.55
    }
    print(record_prediction(sample))
