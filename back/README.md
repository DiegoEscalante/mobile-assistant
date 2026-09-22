# Intelligent Multi-Agent Personal Assistant

> **Master Reference & Context Document:**  
> Please see [**`PROJECT_CONTEXT.md`**](file:///srv/docker/assistant/PROJECT_CONTEXT.md) for the complete architectural specification, database models, sequence diagrams, API documentation, and implementation roadmap for upcoming phases.

---

## Quick Start

### 1. Launch Services (Docker Compose)
```bash
sudo docker compose up -d --build
```

### 2. Verify Health
```bash
curl http://127.0.0.1:8000/health
```

### 3. Run Automated Tests
```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

### 4. Test Assistant (/chat)
```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What tasks do I have pending?"}'
```

### 5. Test Banking Ingestion Webhook
```bash
curl -X POST http://127.0.0.1:8000/webhooks/bank \
  -H "Content-Type: application/json" \
  -d '{"notification":"Compra aprobada en RAPPI por COP 52,000 con tu tarjeta terminada en 4321."}'
```
