.PHONY: test test-core test-engine test-agents build-web help

help:
	@echo "SystemFriction v2 — comandos disponibles:"
	@echo "  make test          — corre todos los tests (JS packages)"
	@echo "  make test-core     — tests sf-core"
	@echo "  make test-engine   — tests sf-engine"
	@echo "  make test-agents   — tests sf-agents"
	@echo "  make build-web     — build web landing"

test:
	@echo "=== sf-core ===" && $(MAKE) test-core
	@echo "=== sf-engine ===" && $(MAKE) test-engine
	@echo "=== sf-agents ===" && $(MAKE) test-agents

test-core:
	cd packages/sf-core && npm test

test-engine:
	cd packages/sf-engine && npm test

test-agents:
	cd packages/sf-agents && npm test

build-web:
	cd apps/web && npm run build
