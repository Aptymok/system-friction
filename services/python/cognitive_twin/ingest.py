# ingest.py
import os
import json
from typing import Dict, Any
import whisper
import PyPDF2
from email import policy
from email.parser import BytesParser

class DataIngestor:
    SUPPORTED = ['.txt', '.md', '.pdf', '.json', '.log', '.wav', '.mp3', '.eml']

    @staticmethod
    def ingest(file_path: str) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in DataIngestor.SUPPORTED:
            raise ValueError(f"Formato no soportado: {ext}")
        raw_text = ""
        if ext in ['.txt', '.md', '.log']:
            with open(file_path, 'r', encoding='utf-8') as f:
                raw_text = f.read()
        elif ext == '.pdf':
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                raw_text = "\n".join([page.extract_text() or "" for page in reader.pages])
        elif ext in ['.wav', '.mp3']:
            model = whisper.load_model("base")
            result = model.transcribe(file_path)
            raw_text = result["text"]
        elif ext == '.eml':
            with open(file_path, 'rb') as f:
                msg = BytesParser(policy=policy.default).parse(f)
            raw_text = msg.get_body(preferencelist=('plain')).get_content()
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                raw_text = f.read()
        return {
            "source_type": ext[1:],
            "source_id": os.path.basename(file_path),
            "raw_text": raw_text,
            "metadata": {"size": len(raw_text), "timestamp": os.path.getmtime(file_path)}
        }
