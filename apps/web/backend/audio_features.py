import librosa
import numpy as np
import io
from pydub import AudioSegment
import tempfile
import os

def extract_features(audio_bytes, filename=None):
    """
    Extrae características musicales de un archivo de audio en bytes.
    Retorna un diccionario con:
    - spectral_entropy: float
    - band_energy_low, mid, high: floats (normalizados)
    - onset_density: float (eventos por segundo)
    - dynamic_range: float (ratio)
    - periodicity: float (autocorrelación máxima en 1-4 segundos)
    """
    # Guardar bytes temporalmente
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
        # Convertir a WAV si es necesario
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=filename.split('.')[-1] if filename else 'wav')
        audio.export(tmp.name, format='wav')
        tmp_path = tmp.name

    try:
        y, sr = librosa.load(tmp_path, sr=None)

        # 1. Entropía espectral (Shannon en magnitudes de STFT)
        stft = np.abs(librosa.stft(y))
        spec = np.sum(stft, axis=0)
        spec_norm = spec / np.sum(spec)
        spectral_entropy = -np.sum(spec_norm * np.log2(spec_norm + 1e-12))

        # 2. Energía por bandas (low: 20-250Hz, mid: 250-4000Hz, high: 4000-20000Hz)
        # Usamos mel con 3 bandas o filtros
        bands = librosa.filters.mel(sr=sr, n_fft=2048, n_mels=3, fmin=20, fmax=20000)
        mel_spec = np.dot(bands, np.abs(stft)**2)
        band_energy = np.sum(mel_spec, axis=1)
        total = np.sum(band_energy) + 1e-12
        band_energy_low = band_energy[0] / total
        band_energy_mid = band_energy[1] / total
        band_energy_high = band_energy[2] / total

        # 3. Densidad de onsets
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=False)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        duration = len(y) / sr
        onset_density = len(onset_times) / duration if duration > 0 else 0

        # 4. Rango dinámico (db difference)
        db = librosa.amplitude_to_db(np.abs(stft), ref=np.max)
        dynamic_range = np.max(db) - np.min(db)

        # 5. Periodicidad (autocorrelación de la envolvente)
        envelope = np.abs(librosa.stft(y, hop_length=512)).mean(axis=0)
        corr = np.correlate(envelope, envelope, mode='full')
        corr = corr[len(corr)//2:]
        # Buscar picos en 1-4 segundos
        hop_time = 512 / sr
        corr_sec = np.arange(len(corr)) * hop_time
        mask = (corr_sec >= 1) & (corr_sec <= 4)
        if np.any(mask):
            periodicity = np.max(corr[mask]) / corr[0] if corr[0] > 0 else 0
        else:
            periodicity = 0

        features = {
            'spectral_entropy': float(spectral_entropy),
            'band_energy_low': float(band_energy_low),
            'band_energy_mid': float(band_energy_mid),
            'band_energy_high': float(band_energy_high),
            'onset_density': float(onset_density),
            'dynamic_range': float(dynamic_range),
            'periodicity': float(periodicity)
        }
        return features
    finally:
        os.unlink(tmp_path)