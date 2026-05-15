#!/usr/bin/env python3
"""
MIHM v3.0 - Extractor Semántico (R_sem, C_sem)
Implementa la especificación del manual: análisis de léxico, densidad semántica,
conflicto léxico y restricción R_sem ≤ C_sem.
Ética del Silencio: si no hay datos suficientes, devuelve None y no simula.
"""

import sys
import json
import re
import argparse
from typing import Dict, Optional, Tuple, List
from pathlib import Path

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

CONFLICT_KEYWORDS = {
    "crisis", "guerra", "muerte", "fracaso", "colapso", "conflicto",
    "fuego", "desastre", "matar", "herida", "lágrima", "sangre",
    "violencia", "miedo", "caos", "destrucción", "dolor", "odio",
    "traición", "abismo", "oscuridad", "ruina", "asedio", "derrota"
}

AMBIGUITY_KEYWORDS = {
    "quizás", "tal vez", "incierto", "duda", "sombras", "entre",
    "quizá", "ambiguo", "incierto", "vapor", "niebla"
}

class MIHMLyricsExtractor:
    def __init__(self, text: Optional[str] = None, audio_path: Optional[str] = None, language: str = "es"):
        self.text = text
        self.audio_path = audio_path
        self.language = language
        self._warning = None

    def extract(self) -> Dict[str, any]:
        if self.audio_path and not self.text:
            self.text = self._transcribe_audio()
            if not self.text:
                self._warning = "TRANSCRIPTION_FAILED - No se pudo transcribir el audio"
                return self._neutral_result()
        if not self.text or len(self.text.strip()) < 10:
            self._warning = "LINGUISTIC_DATA_MISSING - Texto insuficiente (<10 caracteres)"
            return self._neutral_result()
        return self._analyze_text(self.text)

    def _neutral_result(self) -> Dict[str, any]:
        return {
            "R_sem": None,
            "C_sem": None,
            "word_count": 0,
            "unique_words": 0,
            "conflict_ratio": None,
            "warning": self._warning,
            "directive": "NUNCA SIMULA - Datos semánticos insuficientes"
        }

    def _transcribe_audio(self) -> Optional[str]:
        if not WHISPER_AVAILABLE:
            print("[WARN] Whisper no instalado.", file=sys.stderr)
            return None
        if not self.audio_path or not Path(self.audio_path).exists():
            return None
        try:
            model = whisper.load_model("base")
            result = model.transcribe(self.audio_path, language=self.language, task="transcribe")
            return result.get("text", "").strip()
        except Exception as e:
            print(f"[WARN] Transcripción falló: {e}", file=sys.stderr)
            return None

    def _analyze_text(self, text: str) -> Dict[str, any]:
        text_clean = re.sub(r'[^\w\s]', ' ', text.lower())
        words = text_clean.split()
        total_words = len(words)
        if total_words == 0:
            return self._neutral_result()
        unique_words_set = set(words)
        unique_words = len(unique_words_set)
        c_sem = min(1.0, (unique_words / total_words) * 2)
        conflict_count = sum(1 for w in words if w in CONFLICT_KEYWORDS)
        conflict_ratio = conflict_count / total_words
        r_sem_raw = conflict_ratio * 5
        r_sem = min(1.0, r_sem_raw)
        if r_sem > c_sem:
            r_sem = c_sem
        return {
            "R_sem": round(r_sem, 4),
            "C_sem": round(c_sem, 4),
            "word_count": total_words,
            "unique_words": unique_words,
            "conflict_count": conflict_count,
            "conflict_ratio": round(conflict_ratio, 4),
            "warning": None,
            "directive": "NUNCA SIMULA - Datos extraídos directamente del texto"
        }

    @staticmethod
    def from_file(file_path: str, encoding: str = "utf-8"):
        with open(file_path, 'r', encoding=encoding) as f:
            text = f.read()
        return MIHMLyricsExtractor(text=text)

def main():
    parser = argparse.ArgumentParser(description="MIHM v3.0 - Extractor Semántico")
    parser.add_argument("--text", type=str, help="Texto directo")
    parser.add_argument("--audio", type=str, help="Archivo de audio")
    parser.add_argument("--file", type=str, help="Archivo .txt")
    parser.add_argument("--language", type=str, default="es")
    args = parser.parse_args()
    text = None
    audio = None
    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            text = f.read()
    elif args.text:
        text = args.text
    elif args.audio:
        audio = args.audio
    else:
        print(json.dumps({"error": "Se requiere --text, --audio o --file"}))
        sys.exit(1)
    extractor = MIHMLyricsExtractor(text=text, audio_path=audio, language=args.language)
    result = extractor.extract()
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()