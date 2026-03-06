#!/usr/bin/env bash
# install.sh — Install claude rules while preserving directory structure.
#
# Usage:
#   ./install.sh [--target <claude|cursor>] <language> [<language> ...]
#   ./install.sh --check [<language> ...]
#
# Examples:
#   ./install.sh typescript
#   ./install.sh typescript python golang
#   ./install.sh --target cursor typescript
#   ./install.sh --target cursor typescript python golang
#   ./install.sh --check                    # check common + all installed langs
#   ./install.sh --check typescript python  # check specific languages
#
# Targets:
#   claude  (default) — Install rules to ~/.claude/rules/
#   cursor  — Install rules, agents, skills, commands, and MCP to ./.cursor/
#
# This script copies rules into the target directory keeping the common/ and
# language-specific subdirectories intact so that:
#   1. Files with the same name in common/ and <language>/ don't overwrite
#      each other.
#   2. Relative references (e.g. ../common/coding-style.md) remain valid.

set -euo pipefail

# Resolve symlinks — needed when invoked as `ecc-install` via npm/bun bin symlink
SCRIPT_PATH="$0"
while [ -L "$SCRIPT_PATH" ]; do
    link_dir="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
    SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
    # Resolve relative symlinks
    [[ "$SCRIPT_PATH" != /* ]] && SCRIPT_PATH="$link_dir/$SCRIPT_PATH"
done
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
RULES_DIR="$SCRIPT_DIR/rules"

# --- Parse flags ---
TARGET="claude"
PROJECT_LOCAL=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case "${1:-}" in
        --target)
            if [[ -z "${2:-}" ]]; then
                echo "Error: --target requires a value (claude or cursor)" >&2
                exit 1
            fi
            TARGET="$2"
            shift 2
            ;;
        --project)
            # Install language rules into <cwd>/.claude/rules/ instead of ~/.claude/rules/
            # Common rules still go to ~/.claude/rules/common/ (always global)
            PROJECT_LOCAL=true
            shift
            ;;
        --check)
            # Compare installed rules against repo version — do not install anything
            CHECK_ONLY=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [[ "$CHECK_ONLY" == false && "$TARGET" != "claude" && "$TARGET" != "cursor" ]]; then
    echo "Error: unknown target '$TARGET'. Must be 'claude' or 'cursor'." >&2
    exit 1
fi

# --- Check mode: compare installed rules against repo ---
if [[ "$CHECK_ONLY" == true ]]; then
    GLOBAL_RULES_DIR="${CLAUDE_RULES_DIR:-$HOME/.claude/rules}"
    any_diff=false

    # Determine which languages to check
    if [[ $# -eq 0 ]]; then
        # No languages specified: check common + all repo languages that are installed
        langs_to_check=("common")
        for dir in "$RULES_DIR"/*/; do
            name="$(basename "$dir")"
            [[ "$name" == "common" ]] && continue
            [[ -d "$GLOBAL_RULES_DIR/$name" ]] && langs_to_check+=("$name")
        done
    else
        langs_to_check=("common" "$@")
    fi

    for lang in "${langs_to_check[@]}"; do
        src="$RULES_DIR/$lang"
        dest="$GLOBAL_RULES_DIR/$lang"
        if [[ ! -d "$src" ]]; then
            echo "[$lang] NOT IN REPO (skipping)"
            continue
        fi
        if [[ ! -d "$dest" ]]; then
            echo "[$lang] NOT INSTALLED"
            any_diff=true
            continue
        fi
        diff_out="$(diff -rq "$src" "$dest" 2>/dev/null || true)"
        if [[ -z "$diff_out" ]]; then
            echo "[$lang] Up to date"
        else
            echo "[$lang] DIFFERS:"
            echo "$diff_out" | sed 's/^/  /'
            any_diff=true
        fi
    done

    if [[ "$any_diff" == true ]]; then
        echo ""
        echo "Re-run without --check to update installed rules."
        exit 1
    fi
    exit 0
fi

# --- Usage ---
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [--target <claude|cursor>] [--project] <language> [<language> ...]"
    echo "       $0 --check [<language> ...]"
    echo ""
    echo "Flags:"
    echo "  --check    Compare installed rules against repo version (read-only)"
    echo "  --project  Install language rules into <cwd>/.claude/rules/ (project-local)"
    echo "             Common rules always go to ~/.claude/rules/common/ (global)"
    echo ""
    echo "Targets:"
    echo "  claude  (default) — Install rules to ~/.claude/rules/"
    echo "  cursor  — Install rules, agents, skills, commands, and MCP to ./.cursor/"
    echo ""
    echo "Available languages:"
    for dir in "$RULES_DIR"/*/; do
        name="$(basename "$dir")"
        [[ "$name" == "common" ]] && continue
        echo "  - $name"
    done
    exit 1
fi

# --- Claude target ---
if [[ "$TARGET" == "claude" ]]; then
    # --project: lang rules go to <cwd>/.claude/rules/, common stays global
    if [[ "$PROJECT_LOCAL" == true ]]; then
        GLOBAL_RULES_DIR="${CLAUDE_RULES_DIR:-$HOME/.claude/rules}"
        LANG_DEST_DIR="$(pwd)/.claude/rules"
    else
        GLOBAL_RULES_DIR="${CLAUDE_RULES_DIR:-$HOME/.claude/rules}"
        LANG_DEST_DIR="$GLOBAL_RULES_DIR"
    fi

    # Always install common rules globally
    echo "Installing common rules -> $GLOBAL_RULES_DIR/common/"
    mkdir -p "$GLOBAL_RULES_DIR/common"
    cp -r "$RULES_DIR/common/." "$GLOBAL_RULES_DIR/common/"

    # Install each requested language
    for lang in "$@"; do
        # Validate language name to prevent path traversal
        if [[ ! "$lang" =~ ^[a-zA-Z0-9_-]+$ ]]; then
            echo "Error: invalid language name '$lang'. Only alphanumeric, dash, and underscore allowed." >&2
            continue
        fi
        lang_dir="$RULES_DIR/$lang"
        if [[ ! -d "$lang_dir" ]]; then
            echo "Warning: rules/$lang/ does not exist, skipping." >&2
            continue
        fi
        echo "Installing $lang rules -> $LANG_DEST_DIR/$lang/"
        mkdir -p "$LANG_DEST_DIR/$lang"
        cp -r "$lang_dir/." "$LANG_DEST_DIR/$lang/"
    done

    if [[ "$PROJECT_LOCAL" == true ]]; then
        echo "Done. Common rules -> $GLOBAL_RULES_DIR/common/  |  Lang rules -> $LANG_DEST_DIR/"
        echo "Tip: commit $LANG_DEST_DIR/ to share rules with your team."
    else
        echo "Done. Rules installed to $LANG_DEST_DIR/"
    fi
fi

# --- Cursor target ---
if [[ "$TARGET" == "cursor" ]]; then
    DEST_DIR=".cursor"
    CURSOR_SRC="$SCRIPT_DIR/.cursor"

    echo "Installing Cursor configs to $DEST_DIR/"

    # --- Rules ---
    echo "Installing common rules -> $DEST_DIR/rules/"
    mkdir -p "$DEST_DIR/rules"
    # Copy common rules (flattened names like common-coding-style.md)
    if [[ -d "$CURSOR_SRC/rules" ]]; then
        for f in "$CURSOR_SRC/rules"/common-*.md; do
            [[ -f "$f" ]] && cp "$f" "$DEST_DIR/rules/"
        done
    fi

    # Install language-specific rules
    for lang in "$@"; do
        # Validate language name to prevent path traversal
        if [[ ! "$lang" =~ ^[a-zA-Z0-9_-]+$ ]]; then
            echo "Error: invalid language name '$lang'. Only alphanumeric, dash, and underscore allowed." >&2
            continue
        fi
        if [[ -d "$CURSOR_SRC/rules" ]]; then
            found=false
            for f in "$CURSOR_SRC/rules"/${lang}-*.md; do
                if [[ -f "$f" ]]; then
                    cp "$f" "$DEST_DIR/rules/"
                    found=true
                fi
            done
            if $found; then
                echo "Installing $lang rules -> $DEST_DIR/rules/"
            else
                echo "Warning: no Cursor rules for '$lang' found, skipping." >&2
            fi
        fi
    done

    # --- Agents ---
    if [[ -d "$CURSOR_SRC/agents" ]]; then
        echo "Installing agents -> $DEST_DIR/agents/"
        mkdir -p "$DEST_DIR/agents"
        cp -r "$CURSOR_SRC/agents/." "$DEST_DIR/agents/"
    fi

    # --- Skills ---
    if [[ -d "$CURSOR_SRC/skills" ]]; then
        echo "Installing skills -> $DEST_DIR/skills/"
        mkdir -p "$DEST_DIR/skills"
        cp -r "$CURSOR_SRC/skills/." "$DEST_DIR/skills/"
    fi

    # --- Commands ---
    if [[ -d "$CURSOR_SRC/commands" ]]; then
        echo "Installing commands -> $DEST_DIR/commands/"
        mkdir -p "$DEST_DIR/commands"
        cp -r "$CURSOR_SRC/commands/." "$DEST_DIR/commands/"
    fi

    # --- Hooks ---
    if [[ -f "$CURSOR_SRC/hooks.json" ]]; then
        echo "Installing hooks config -> $DEST_DIR/hooks.json"
        cp "$CURSOR_SRC/hooks.json" "$DEST_DIR/hooks.json"
    fi
    if [[ -d "$CURSOR_SRC/hooks" ]]; then
        echo "Installing hook scripts -> $DEST_DIR/hooks/"
        mkdir -p "$DEST_DIR/hooks"
        cp -r "$CURSOR_SRC/hooks/." "$DEST_DIR/hooks/"
    fi

    # --- MCP Config ---
    if [[ -f "$CURSOR_SRC/mcp.json" ]]; then
        echo "Installing MCP config -> $DEST_DIR/mcp.json"
        cp "$CURSOR_SRC/mcp.json" "$DEST_DIR/mcp.json"
    fi

    echo "Done. Cursor configs installed to $DEST_DIR/"
fi
