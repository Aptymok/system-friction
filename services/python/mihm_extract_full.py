#!/usr/bin/env python3
"""
MIHM v3.0 - Extracto completo: acústico + semántico + NTI + IHG final
Ahora acepta --json para pasar R_sem y C_sem ya calculados.
"""
import sys
import json
import argparse
from pathlib import Path
from audio_features import MIHMAcousticExtractor
from lyrics_extract import MIHMLyricsExtractor

def main():
    parser = argparse.ArgumentParser(description="MIHM Full Extractor v3.0")
    parser.add_argument("audio", type=str, help="Archivo WAV para análisis")
    parser.add_argument("--text", type=str, help="Texto/letra para R_sem y C_sem")
    parser.add_argument("--json", type=str, help='JSON con R_sem y C_sem (ej: \'{"R_sem":0.6,"C_sem":0.7}\')')
    parser.add_argument("--nti", type=float, default=0.5)
    parser.add_argument("--no-text", action="store_true", help="Marcar si no hay texto disponible")
    args = parser.parse_args()

    # 1. Extracción acústica
    try:
        acoustic = MIHMAcousticExtractor(args.audio)
        mihm_raw = acoustic.extract_all()
    except Exception as e:
        print(json.dumps({"status": "BLOCKED", "error": str(e)}))
        sys.exit(1)

    semantic_warning = None

    # 2. R_sem y C_sem: prioridad a --json, luego --text, luego --no-text
    if args.json:
        try:
            sem_data = json.loads(args.json)
            mihm_raw["R_sem"] = sem_data.get("R_sem")
            mihm_raw["C_sem"] = sem_data.get("C_sem")
            if mihm_raw["R_sem"] is None or mihm_raw["C_sem"] is None:
                semantic_warning = "JSON_INCOMPLETO - faltan R_sem o C_sem"
        except Exception as e:
            semantic_warning = f"JSON_INVALIDO: {e}"
    elif args.no_text:
        mihm_raw["R_sem"] = None
        mihm_raw["C_sem"] = None
        semantic_warning = "SIN_TEXTO_FLAG"
    else:
        text_source = args.text
        audio_for_transcription = None if args.text else args.audio
        try:
            sem_extractor = MIHMLyricsExtractor(text=text_source, audio_path=audio_for_transcription)
            sem_result = sem_extractor.extract()
            mihm_raw["R_sem"] = sem_result.get("R_sem")
            mihm_raw["C_sem"] = sem_result.get("C_sem")
            if sem_result.get("warning"):
                semantic_warning = sem_result["warning"]
        except Exception as e:
            mihm_raw["R_sem"] = None
            mihm_raw["C_sem"] = None
            semantic_warning = f"SEMANTIC_EXTRACTOR_FAILED: {e}"

    # Restricción R_sem <= C_sem
    if mihm_raw["R_sem"] is not None and mihm_raw["C_sem"] is not None:
        if mihm_raw["R_sem"] > mihm_raw["C_sem"]:
            mihm_raw["R_sem"] = mihm_raw["C_sem"]
            semantic_warning = (semantic_warning + " | R_sem ajustado a C_sem") if semantic_warning else "R_sem ajustado a C_sem"

    # 3. Verificar emisión mínima
    if not MIHMAcousticExtractor.is_valid_emission(mihm_raw):
        output = {
            "status": "INSUFFICIENT_DATA",
            "directive": "SILENCIO TECNICO - Núcleo de 6 variables no alcanzado",
            "measured_core": {k: mihm_raw.get(k) for k in ['F_s','D_i','E_r','C_s','D_cog','G_f']},
            "file": args.audio,
            "duration_sec": acoustic.duration
        }
        print(json.dumps(output, indent=2))
        sys.exit(0)

    # 4. Calcular IHG
    ihg_result = MIHMAcousticExtractor.compute_ihg(mihm_raw, nti=args.nti)

    output = {
        "status": "OK",
        "file": str(Path(args.audio).name),
        "duration_sec": round(acoustic.duration, 3),
        "mihm_vector": {k: (v if v is not None else None) for k, v in mihm_raw.items()},
        "penalties": ihg_result["penalty_sum"],
        "weighted_sum": ihg_result["weighted_sum"],
        "ihg_raw": ihg_result["ihg_raw"],
        "ihg_final": ihg_result["ihg_final"],
        "nti_used": args.nti,
        "emission_valid": True,
        "directive": "NUNCA SIMULA - Datos extraídos directamente del archivo y manual MIHM v3.0"
    }
    if semantic_warning:
        output["warning"] = semantic_warning

    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()