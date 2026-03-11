# Roadmap: Performance, Token & Cost Management

**Branch:** `roadmap/performance-token-cost-management`
**Status:** In progress

## Problem

clarc hat keine aktiven Kostenkontroll-Mechanismen. Nutzer können unbemerkt $50+ pro Session ausgeben. Kostenschätzungen sind ±300% ungenau. Kein einziger Agent nutzt Haiku, obwohl 90% der Worker-Tasks damit günstiger wären.

## Ziele

1. Aktive Budget-Warnungen (nicht nur post-hoc `/session-cost`)
2. Präzisere Kostenschätzungen (per-Tool statt Pauschal)
3. Haiku-Routing für leichte Tasks (10-15× günstiger als Sonnet)
4. MCP-Server-Caching (Latenz reduzieren)
5. Prompt-Caching-Guidance (Dokumentation + Skill)

---

## Tasks

### P0 — Kritisch (direkter User-Impact)

| Task | Datei | Status |
|---|---|---|
| toolCallCount-Bug fixen (zählt Unique statt Total) | `scripts/hooks/session-end.js` | ✅ |
| Per-Tool-Heuristik für Kostenschätzung | `scripts/hooks/session-end.js` | ✅ |
| Budget-Guard-Hook (Warn + Block) | `scripts/hooks/budget-guard.js` + `hooks/hooks.json` | ✅ |

### P1 — Hoch (Kosten und Latenz)

| Task | Datei | Status |
|---|---|---|
| Summarizer-Haiku-Agent | `agents/summarizer-haiku.md` | ✅ |
| Orchestrator: Haiku-Routing-Guidance | `agents/orchestrator.md` | ✅ |
| MCP component-graph Caching | `mcp-server/index.js` | ✅ |

### P2 — Mittel (Dokumentation und Guidance)

| Task | Datei | Status |
|---|---|---|
| performance.md: Budget + Agent-Overhead | `rules/common/performance.md` | ✅ |
| Prompt-Caching-Sektion im Skill | `skills/cost-aware-llm-pipeline/SKILL.md` | ✅ |

---

## Nicht in dieser Roadmap

- Skill-Splits (api-contract, nodejs-backend-patterns) — separates Refactoring-Ticket
- Automatisches Context-Compacting — erfordert Claude Code API-Support
- Modell-Detection aus API-Headers — nicht verfügbar ohne direkten API-Zugriff

---

## Geschätzte Einsparungen

| Maßnahme | Einsparung/Jahr |
|---|---|
| Budget-Guard (verhindert Überausgaben) | $500–2.000 |
| Haiku-Routing für Worker-Agents | $1.000–3.000 |
| Präzisere Kostenschätzungen (bessere Entscheidungen) | $200–500 |
| MCP-Caching (Latenzreduktion) | nicht monetär |
| **Total** | **~$1.700–5.500** |
