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

# Intentar importar whisper silenciosamente
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Palabras de conflicto/tensión según la especificación MIHM
CONFLICT_KEYWORDS = {
    "crisis", "guerra", "muerte", "fracaso", "colapso", "conflicto",
    "fuego", "desastre", "matar", "herida", "lágrima", "sangre",
    "violencia", "miedo", "caos", "destrucción", "dolor", "odio",
    "traición", "abismo", "oscuridad", "ruina", "asedio", "derrota"
}

# Palabras de ambigüedad productiva (zona media)
AMBIGUITY_KEYWORDS = {
    "quizás", "tal vez", "incierto", "duda", "sombras", "entre",
    "quizá", "ambiguo", "incierto", "vapor", "niebla"
}

class MIHMLyricsExtractor:
    """
    Extractor semántico para MIHM v3.0.
    Calcula R_sem (Resonancia Semántica) y C_sem (Campo Semántico)
    a partir de texto o transcripción de audio.
    """
    
    def __init__(self, 
                 text: Optional[str] = None, 
                 audio_path: Optional[str] = None,
                 language: str = "es"):
        """
        Args:
            text: Texto directo para análisis
            audio_path: Ruta a archivo de audio para transcribir
            language: Idioma para transcripción ('es' o 'en')
        """
        self.text = text
        self.audio_path = audio_path
        self.language = language
        self._warning = None
    
    def extract(self) -> Dict[str, any]:
        """
        Extrae R_sem y C_sem.
        Retorna None para cualquier variable que no pueda medirse.
        """
        # 1. Obtener texto si se proporcionó audio y no hay texto
        if self.audio_path and not self.text:
            self.text = self._transcribe_audio()
            if not self.text:
                self._warning = "TRANSCRIPTION_FAILED - No se pudo transcribir el audio"
                return self._neutral_result()
        
        # 2. Validar texto suficiente (mínimo 10 caracteres)
        if not self.text or len(self.text.strip()) < 10:
            self._warning = "LINGUISTIC_DATA_MISSING - Texto insuficiente (<10 caracteres)"
            return self._neutral_result()
        
        # 3. Analizar texto
        return self._analyze_text(self.text)
    
    def _neutral_result(self) -> Dict[str, any]:
        """
        Retorna valores neutrales (None) cuando no hay datos suficientes.
        Ética del Silencio: no se simulan valores.
        """
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
        """Transcribe audio usando Whisper (local, sin API key)."""
        if not WHISPER_AVAILABLE:
            print("[WARN] Whisper no instalado. Ejecuta: pip install openai-whisper", 
                  file=sys.stderr)
            return None
        
        if not self.audio_path or not Path(self.audio_path).exists():
            print(f"[WARN] Archivo de audio no encontrado: {self.audio_path}", 
                  file=sys.stderr)
            return None
        
        try:
            # Cargar modelo base (balance entre rendimiento y precisión)
            # Modelos disponibles: "tiny", "base", "small", "medium", "large"
            model = whisper.load_model("base")
            
            # Transcribir
            result = model.transcribe(
                self.audio_path,
                language=self.language,
                task="transcribe"
            )
            
            transcribed_text = result.get("text", "").strip()
            if transcribed_text:
                print(f"[OK] Transcripción completada: {len(transcribed_text)} caracteres", 
                      file=sys.stderr)
                return transcribed_text
            else:
                print("[WARN] Transcripción vacía - el audio no contiene voz reconocible", 
                      file=sys.stderr)
                return None
                
        except Exception as e:
            print(f"[WARN] Error en transcripción: {e}", file=sys.stderr)
            return None
    
    def _analyze_text(self, text: str) -> Dict[str, any]:
        """
        Calcula R_sem y C_sem según especificación MIHM v3.0.
        
        C_sem: Campo Semántico - riqueza de vocabulario (unique_words / total_words)
        R_sem: Resonancia Semántica - densidad de palabras de conflicto/tensión
        """
        # Limpiar y tokenizar
        text_clean = re.sub(r'[^\w\s]', ' ', text.lower())
        words = text_clean.split()
        total_words = len(words)
        
        if total_words == 0:
            return self._neutral_result()
        
        # Calcular palabras únicas (vocabulario)
        unique_words_set = set(words)
        unique_words = len(unique_words_set)
        
        # C_sem = riqueza de vocabulario (normalizado con tope 1.0)
        # Fórmula: unique_words / total_words * 2, con límite 1.0
        # Esto da valores entre 0.0 y 1.0
        c_sem = min(1.0, (unique_words / total_words) * 2)
        
        # Calcular palabras de conflicto
        conflict_count = sum(1 for w in words if w in CONFLICT_KEYWORDS)
        conflict_ratio = conflict_count / total_words
        
        # R_sem = densidad de conflicto normalizada
        # Fórmula: conflict_ratio * 5, con límite 1.0
        # Una palabra de conflicto cada 20 palabras da ~0.25
        r_sem_raw = conflict_ratio * 5
        r_sem = min(1.0, r_sem_raw)
        
        # Aplicar restricción MIHM: R_sem ≤ C_sem
        # Si hay más resonancia que campo semántico, se limita
        if r_sem > c_sem:
            r_sem = c_sem
        
        # Determinar nivel interpretativo
        r_sem_level = self._get_level(r_sem)
        c_sem_level = self._get_level(c_sem)
        
        return {
            "R_sem": round(r_sem, 4),
            "C_sem": round(c_sem, 4),
            "R_sem_level": r_sem_level,
            "C_sem_level": c_sem_level,
            "word_count": total_words,
            "unique_words": unique_words,
            "conflict_count": conflict_count,
            "conflict_ratio": round(conflict_ratio, 4),
            "warning": None,
            "directive": "NUNCA SIMULA - Datos extraídos directamente del texto"
        }
    
    def _get_level(self, value: float) -> str:
        """Retorna nivel interpretativo según rangos MIHM."""
        if value is None:
            return "NO_DATA"
        if value < 0.33:
            return "BAJO"
        elif value < 0.66:
            return "MEDIO"
        else:
            return "ALTO"
    
    @staticmethod
    def from_file(file_path: str, encoding: str = "utf-8") -> 'MIHMLyricsExtractor':
        """Crea extractor desde archivo de texto."""
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                text = f.read()
            return MIHMLyricsExtractor(text=text)
        except Exception as e:
            raise RuntimeError(f"Error leyendo archivo {file_path}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="MIHM v3.0 - Extractor Semántico",
        epilog="Ejemplos:\n"
               "  python lyrics_extractor.py --text 'Letra de la canción'\n"
               "  python lyrics_extractor.py --audio 'cancion.mp3'\n"
               "  python lyrics_extractor.py --file 'letra.txt'"
    )
    parser.add_argument("--text", type=str, help="Texto directo para análisis")
    parser.add_argument("--audio", type=str, help="Archivo de audio para transcribir")
    parser.add_argument("--file", type=str, help="Archivo .txt con la letra")
    parser.add_argument("--language", type=str, default="es", 
                        help="Idioma para transcripción (es/en)")
    
    args = parser.parse_args()
    
    # Prioridad: --file > --text > --audio
    text = None
    audio = None
    
    if args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            print(json.dumps({"error": str(e), "directive": "NUNCA SIMULA"}))
            sys.exit(1)
    elif args.text:
        text = args.text
    elif args.audio:
        audio = args.audio
    else:
        print(json.dumps({
            "error": "Se requiere --text, --audio o --file",
            "directive": "NUNCA SIMULA - Sin datos de entrada"
        }))
        sys.exit(1)
    
    extractor = MIHMLyricsExtractor(text=text, audio_path=audio, language=args.language)
    result = extractor.extract()
    
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()