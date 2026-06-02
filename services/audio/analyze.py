#!/usr/bin/env python3
import json
import sys
import wave


def clamp01(value):
    try:
        return max(0.0, min(1.0, float(value)))
    except Exception:
        return 0.0


def analyze_wav(path):
    with wave.open(path, "rb") as wav:
        frames = wav.getnframes()
        rate = wav.getframerate()
        channels = wav.getnchannels()
        duration = frames / float(rate or 1)
        raw = wav.readframes(min(frames, rate * 30))
    if not raw:
        return {}
    sample_width = max(1, wav.getsampwidth())
    step = sample_width * channels
    values = []
    for index in range(0, len(raw) - step, step):
        sample = int.from_bytes(raw[index:index + sample_width], byteorder="little", signed=True)
        values.append(sample)
    peak = max([abs(value) for value in values] or [1])
    mean_abs = sum(abs(value) for value in values) / float(len(values) or 1)
    crossings = sum(1 for a, b in zip(values, values[1:]) if (a < 0 <= b) or (a >= 0 > b))
    return {
        "duration_seconds": duration,
        "rms_energy": clamp01(mean_abs / float(peak or 1)),
        "zero_crossing_rate": clamp01(crossings / float(len(values) or 1)),
        "dynamic_range": clamp01(peak / 32768.0),
        "sample_rate": rate,
        "channels": channels,
    }


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    path = payload.get("path")
    if not path:
        print(json.dumps({"ok": False, "error": "path_required"}))
        return
    try:
        print(json.dumps({"ok": True, "data": analyze_wav(path)}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))


if __name__ == "__main__":
    main()
