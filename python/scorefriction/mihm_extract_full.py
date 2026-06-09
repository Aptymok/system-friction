#!/usr/bin/env python3
"""
MIHM v3.0 - Extracto completo: acústico + semántico + NTI + IHG final
Cumple con el manual (CC BY 4.0, Aptymok)
Ejecuta: python mihm_extract_full.py "archivo.wav" [--text "letra"] [--nti 0.5]
"""
import sys
import json
import argparse
from pathlib import Path

# Asegúrate de que estos módulos existen en el mismo directorio
from audio_features import MIHMAcousticExtractor
from lyrics_extractor import MIHMLyricsExtractor


def main():
    parser = argparse.ArgumentParser(description="MIHM Full Extractor v3.0 (manual compliant)")
    parser.add_argument("audio", type=str, help="Archivo WAV para análisis")
    parser.add_argument("--text", type=str, help="Texto/letra para R_sem y C_sem")
    parser.add_argument("--nti", type=float, default=0.5, help="Valor NTI externo (si se conoce)")
    parser.add_argument("--no-text", action="store_true", help="Marcar si no hay texto disponible (R_sem y C_sem se dejan como None)")
    
    args = parser.parse_args()
    
    # 1. Extracción acústica (siempre se intenta)
    try:
        acoustic = MIHMAcousticExtractor(args.audio)
        mihm_raw = acoustic.extract_all()   # Diccionario con 11 claves, valores numéricos o None
    except Exception as e:
        print(json.dumps({
            "status": "BLOCKED",
            "error": str(e),
            "directive": "NUNCA SIMULA - No se pudo extraer audio"
        }))
        sys.exit(1)
    
    semantic_warning = None
    
    # 2. Extracción semántica (solo si hay fuente de texto)
    if args.no_text:
        # El usuario indica explícitamente que no hay texto
        mihm_raw["R_sem"] = None
        mihm_raw["C_sem"] = None
        semantic_warning = "SIN_TEXTO_FLAG - R_sem y C_sem no evaluadas (no se simulan)"
    else:
        # Determinar fuente: prioridad a --text, luego a transcripción del audio (si no se dio --text)
        text_source = args.text
        audio_for_transcription = None if args.text else args.audio
        
        try:
            sem_extractor = MIHMLyricsExtractor(
                text=text_source,
                audio_path=audio_for_transcription
            )
            sem_result = sem_extractor.extract()
            
            # sem_result es un diccionario con claves "R_sem", "C_sem", y posible "warning"
            mihm_raw["R_sem"] = sem_result.get("R_sem")
            mihm_raw["C_sem"] = sem_result.get("C_sem")
            if sem_result.get("warning"):
                semantic_warning = sem_result["warning"]
        except Exception as e:
            # Fallo en el extractor semántico: no se simulan valores
            mihm_raw["R_sem"] = None
            mihm_raw["C_sem"] = None
            semantic_warning = f"SEMANTIC_EXTRACTOR_FAILED: {str(e)}"
    
    # Aplicar restricción del manual: si R_sem > C_sem, se ajusta
    if mihm_raw["R_sem"] is not None and mihm_raw["C_sem"] is not None:
        if mihm_raw["R_sem"] > mihm_raw["C_sem"]:
            mihm_raw["R_sem"] = mihm_raw["C_sem"]
            if semantic_warning:
                semantic_warning += " | R_sem ajustado a C_sem"
            else:
                semantic_warning = "R_sem ajustado a C_sem por restricción del manual"
    
    # 3. Verificar emisión mínima válida (núcleo de 6 variables)
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
    
    # 4. Calcular IHG con penalizaciones y NTI
    ihg_result = MIHMAcousticExtractor.compute_ihg(mihm_raw, nti=args.nti)
    
    # 5. Construir salida final
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