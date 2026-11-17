# Build from repository root:
# docker build -f services/python/sfi_engine/Dockerfile .
# Reuses the canonical MIHM Python files; no forked model or copied formula.
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv/sfi
COPY services/python/sfi_engine/requirements.txt /tmp/mihm-requirements.txt
RUN pip install --no-cache-dir -r /tmp/mihm-requirements.txt
COPY python/scorefriction/ /srv/sfi/python/scorefriction/
COPY services/python/sfi_engine/ /srv/sfi/services/python/sfi_engine/
WORKDIR /srv/sfi/services/python/sfi_engine
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
