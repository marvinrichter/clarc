#!/usr/bin/env python3
"""
conflict-detector.py — Detect contradictory instincts in the same domain.

Conflict definition:
  Two instincts in the same domain whose action fields contain
  antonymous keywords (e.g. "prefer functional" vs "prefer class-based").

Usage:
  python3 conflict-detector.py [--project-id <id>] [--fix]
    --project-id  Specific project hash (default: auto-detect via detect-project.sh)
    --fix         Remove the lower-confidence instinct from each conflict pair
    --json        Output conflicts as JSON instead of human-readable text

Output:
  ~/.claude/homunculus/conflicts.json  — persisted conflict list
  stdout  — human-readable conflict report
"""

import json
import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Antonym pairs — simple heuristic for detecting opposing instructions
# ---------------------------------------------------------------------------
ANTONYM_PAIRS = [
    ("functional", "class"),
    ("functional", "object-oriented"),
    ("functional", "oop"),
    ("immutable", "mutable"),
    ("immutable", "in-place"),
    ("async", "sync"),
    ("async", "synchronous"),
    ("typed", "untyped"),
    ("strict", "loose"),
    ("strict", "lenient"),
    ("snake_case", "camelcase"),
    ("snake_case", "pascalcase"),
    ("camelcase", "snake_case"),
    ("tabs", "spaces"),
    ("spaces", "tabs"),
    ("always", "never"),
    ("prefer", "avoid"),
    ("use", "avoid"),
    ("enable", "disable"),
    ("include", "exclude"),
    ("require", "skip"),
    ("enforce", "ignore"),
]

HOMUNCULUS_DIR = Path(os.environ.get("HOME", "~")).expanduser() / ".claude" / "homunculus"
CONFLICTS_FILE = HOMUNCULUS_DIR / "conflicts.json"


def get_project_id():
    """Auto-detect current project ID via detect-project.sh."""
    script = Path(__file__).parent / "detect-project.sh"
    if not script.exists():
        return None
    try:
        result = subprocess.run(
            ["bash", str(script)],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip() or None
    except Exception:
        pass
    return None


def load_instincts_from_dir(directory: Path) -> list[dict]:
    """Load all instinct YAML/JSON files from a directory."""
    instincts = []
    if not directory.exists():
        return instincts
    for f in directory.iterdir():
        if f.suffix in (".yaml", ".yml", ".json"):
            try:
                content = f.read_text(encoding="utf-8")
                if f.suffix == ".json":
                    obj = json.loads(content)
                else:
                    # Simple YAML key: value parser (avoid yaml dependency)
                    obj = {}
                    for line in content.splitlines():
                        if line.startswith("#") or ":" not in line:
                            continue
                        k, _, v = line.partition(":")
                        obj[k.strip()] = v.strip().strip('"').strip("'")
                obj["_file"] = str(f)
                obj["_id"] = obj.get("id") or f.stem
                instincts.append(obj)
            except Exception:
                continue
    return instincts


def load_all_instincts(project_id: str | None) -> list[dict]:
    """Load project-scoped + global instincts."""
    instincts = []

    # Global instincts
    global_dir = HOMUNCULUS_DIR / "instincts"
    for inst in load_instincts_from_dir(global_dir):
        inst["_scope"] = "global"
        instincts.append(inst)

    # Project-scoped instincts
    if project_id:
        project_dir = HOMUNCULUS_DIR / "projects" / project_id / "instincts" / "personal"
        for inst in load_instincts_from_dir(project_dir):
            inst["_scope"] = "project"
            instincts.append(inst)

    return instincts


def get_action_text(instinct: dict) -> str:
    """Extract the action/description text to check for antonyms."""
    fields = ["action", "description", "pattern", "instinct", "behavior", "rule"]
    parts = []
    for f in fields:
        v = instinct.get(f, "")
        if v:
            parts.append(str(v).lower())
    return " ".join(parts)


def get_domain(instinct: dict) -> str:
    return str(instinct.get("domain", instinct.get("category", "general"))).lower()


def get_confidence(instinct: dict) -> float:
    try:
        return float(instinct.get("confidence", 0.5))
    except (TypeError, ValueError):
        return 0.5


def detect_conflicts(instincts: list[dict]) -> list[dict]:
    """Find pairs of instincts in the same domain with conflicting actions."""
    conflicts = []
    seen = set()

    for i, a in enumerate(instincts):
        domain_a = get_domain(a)
        text_a = get_action_text(a)

        for j, b in enumerate(instincts):
            if j <= i:
                continue
            pair_key = (a["_id"], b["_id"])
            if pair_key in seen:
                continue

            domain_b = get_domain(b)
            if domain_a != domain_b:
                continue

            text_b = get_action_text(b)

            # Check for antonym pairs
            for word1, word2 in ANTONYM_PAIRS:
                if word1 in text_a and word2 in text_b:
                    conflicts.append({
                        "id": f"{a['_id']}__vs__{b['_id']}",
                        "instinct_a": {"id": a["_id"], "scope": a.get("_scope"), "action": text_a[:200], "confidence": get_confidence(a), "file": a.get("_file")},
                        "instinct_b": {"id": b["_id"], "scope": b.get("_scope"), "action": text_b[:200], "confidence": get_confidence(b), "file": b.get("_file")},
                        "domain": domain_a,
                        "conflict_keywords": [word1, word2],
                        "detected_at": datetime.utcnow().isoformat()
                    })
                    seen.add(pair_key)
                    break
                if word2 in text_a and word1 in text_b:
                    conflicts.append({
                        "id": f"{a['_id']}__vs__{b['_id']}",
                        "instinct_a": {"id": a["_id"], "scope": a.get("_scope"), "action": text_a[:200], "confidence": get_confidence(a), "file": a.get("_file")},
                        "instinct_b": {"id": b["_id"], "scope": b.get("_scope"), "action": text_b[:200], "confidence": get_confidence(b), "file": b.get("_file")},
                        "domain": domain_a,
                        "conflict_keywords": [word2, word1],
                        "detected_at": datetime.utcnow().isoformat()
                    })
                    seen.add(pair_key)
                    break

    return conflicts


def save_conflicts(conflicts: list[dict]):
    HOMUNCULUS_DIR.mkdir(parents=True, exist_ok=True)
    CONFLICTS_FILE.write_text(json.dumps(conflicts, indent=2), encoding="utf-8")


def fix_conflicts(conflicts: list[dict]):
    """Remove the lower-confidence instinct from each conflict pair."""
    for c in conflicts:
        a, b = c["instinct_a"], c["instinct_b"]
        loser = a if a["confidence"] < b["confidence"] else b
        loser_file = loser.get("file")
        if loser_file and os.path.exists(loser_file):
            os.remove(loser_file)
            print(f"  Removed lower-confidence instinct: {loser['id']} (conf={loser['confidence']:.2f})")
        else:
            print(f"  Could not find file for: {loser['id']}")


def print_conflicts(conflicts: list[dict]):
    if not conflicts:
        print("No conflicts detected.")
        return
    print(f"\n{'='*60}")
    print(f"  INSTINCT CONFLICTS — {len(conflicts)} found")
    print(f"{'='*60}\n")
    for c in conflicts:
        a, b = c["instinct_a"], c["instinct_b"]
        print(f"  Domain: {c['domain']} | Keywords: {c['conflict_keywords']}")
        print(f"  A [{a['scope']}] {a['id']} (conf={a['confidence']:.2f})")
        print(f"    {a['action'][:100]}")
        print(f"  B [{b['scope']}] {b['id']} (conf={b['confidence']:.2f})")
        print(f"    {b['action'][:100]}")
        winner = a if a["confidence"] >= b["confidence"] else b
        print(f"  Resolution: keep '{winner['id']}' (higher confidence)")
        print()
    print(f"Run with --fix to remove lower-confidence instincts.")
    print(f"Conflicts saved to: {CONFLICTS_FILE}\n")


def main():
    parser = argparse.ArgumentParser(description="Detect conflicting instincts")
    parser.add_argument("--project-id", help="Project hash ID (auto-detected if omitted)")
    parser.add_argument("--fix", action="store_true", help="Remove lower-confidence instinct in each conflict pair")
    parser.add_argument("--json", action="store_true", help="Output conflicts as JSON")
    args = parser.parse_args()

    project_id = args.project_id or get_project_id()
    instincts = load_all_instincts(project_id)

    if not instincts:
        print("No instincts found. Run /learn or enable continuous-learning-v2.")
        sys.exit(0)

    conflicts = detect_conflicts(instincts)
    save_conflicts(conflicts)

    if args.json:
        print(json.dumps(conflicts, indent=2))
    else:
        print_conflicts(conflicts)

    if args.fix and conflicts:
        print("\nFixing conflicts...")
        fix_conflicts(conflicts)
        # Re-save with resolved flag
        for c in conflicts:
            c["resolved"] = True
        save_conflicts(conflicts)

    sys.exit(1 if conflicts and not args.fix else 0)


if __name__ == "__main__":
    main()
