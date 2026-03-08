#!/usr/bin/env bash
# install.sh — Install clarc rules, agents, skills, and commands to your editor/AI tool.
#
# Usage:
#   ./install.sh [--target <claude|cursor|opencode|codex>] <language> [<language> ...]
#   ./install.sh --check [<language> ...]
#
# Examples:
#   ./install.sh typescript
#   ./install.sh typescript python go
#   ./install.sh --target cursor typescript
#   ./install.sh --target cursor typescript python go
#   ./install.sh --target opencode typescript
#   ./install.sh --target codex
#   ./install.sh --check                    # check common + all installed langs
#   ./install.sh --check typescript python  # check specific languages
#
# Targets:
#   claude   (default) — Install rules to ~/.claude/rules/
#   cursor   — Install rules to .cursor/rules/ + .cursorrules (Cursor IDE)
#   opencode — Install commands and instructions to .opencode/ (OpenCode IDE)
#   codex    — Install instructions and commands to codex/ (Codex CLI)
#
# This script copies rules into the target directory keeping the common/ and
# language-specific subdirectories intact so that:
#   1. Files with the same name in common/ and <language>/ don't overwrite
#      each other.
#   2. Relative references (e.g. ../common/coding-style.md) remain valid.

set -euo pipefail

# Resolve symlinks — needed when invoked as `clarc-install` via npm/bun bin symlink
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
ENABLE_LEARNING=false
LEARNING_FLAG_SET=false

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
        --enable-learning)
            # Non-interactive: enable continuous learning without prompting (for CI)
            ENABLE_LEARNING=true
            LEARNING_FLAG_SET=true
            shift
            ;;
        --no-learning)
            # Non-interactive: skip learning prompt
            LEARNING_FLAG_SET=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [[ "$CHECK_ONLY" == false && "$TARGET" != "claude" && "$TARGET" != "cursor" && "$TARGET" != "opencode" && "$TARGET" != "codex" ]]; then
    echo "Error: unknown target '$TARGET'. Must be 'claude', 'cursor', 'opencode', or 'codex'." >&2
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
    echo "  claude   (default) — Install rules to ~/.claude/rules/"
    echo "  cursor   — Install rules, agents, skills, commands to ./.cursor/ + .cursorrules"
    echo "  opencode — Install commands, prompts, and instructions to ./.opencode/"
    echo "  codex    — Install instructions and commands to ./codex/ for Codex CLI"
    echo ""
    echo "Available languages:"
    for dir in "$RULES_DIR"/*/; do
        name="$(basename "$dir")"
        [[ "$name" == "common" ]] && continue
        echo "  - $name"
    done
    exit 1
fi

# --- Continuous Learning prompt ---
# Asks (or uses --enable-learning flag) to patch ~/.claude/settings.json
# with the observe.sh PostToolUse hook and set observer.enabled: true.
enable_learning_prompt() {
    if [[ "$LEARNING_FLAG_SET" == true && "$ENABLE_LEARNING" == false ]]; then
        return 0
    fi

    if [[ "$LEARNING_FLAG_SET" == false ]]; then
        echo ""
        echo "Enable continuous learning? (Captures tool use patterns to build instincts)"
        printf "  Enable? [y/N] "
        read -r answer < /dev/tty
        case "$answer" in
            [yY]|[yY][eE][sS]) ENABLE_LEARNING=true ;;
            *) ENABLE_LEARNING=false ;;
        esac
    fi

    if [[ "$ENABLE_LEARNING" == false ]]; then
        return 0
    fi

    local settings_file="${HOME}/.claude/settings.json"
    local config_json="${SCRIPT_DIR}/skills/continuous-learning-v2/config.json"
    local observe_hook="${SCRIPT_DIR}/skills/continuous-learning-v2/hooks/observe.sh"

    # Patch settings.json using Node (already a dependency)
    if command -v node >/dev/null 2>&1; then
        node - "$settings_file" "$observe_hook" <<'NODEEOF'
const fs = require('fs');
const path = require('path');

const settingsPath = process.argv[2];
const observeHook = process.argv[3];

let settings = {};
try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch {
    // Start fresh if missing or malformed
}

if (!settings.hooks) settings.hooks = {};
if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

// Check if observe.sh is already registered
const alreadyAdded = settings.hooks.PostToolUse.some(entry =>
    Array.isArray(entry.hooks) &&
    entry.hooks.some(h => typeof h.command === 'string' && h.command.includes('observe.sh'))
);

if (!alreadyAdded) {
    settings.hooks.PostToolUse.push({
        "matcher": "*",
        "hooks": [{
            "type": "command",
            "command": `"${observeHook}"`,
            "async": true,
            "timeout": 10
        }],
        "description": "Capture tool use results for continuous learning"
    });
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log('  Patched ~/.claude/settings.json with observe.sh hook.');
} else {
    console.log('  observe.sh hook already registered in ~/.claude/settings.json.');
}
NODEEOF
    else
        echo "  Warning: Node.js not found — cannot patch settings.json automatically."
        echo "  Add observe.sh manually to ~/.claude/settings.json PostToolUse hooks."
    fi

    # Patch config.json observer.enabled: true
    if [[ -f "$config_json" ]]; then
        node - "$config_json" <<'NODEEOF'
const fs = require('fs');
const p = process.argv[2];
try {
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    cfg.observer = cfg.observer || {};
    cfg.observer.enabled = true;
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
    console.log('  Set observer.enabled: true in config.json.');
} catch(e) {
    console.error('  Warning: Could not patch config.json:', e.message);
}
NODEEOF
    fi

    echo ""
    echo "Learning enabled. Run /instinct-status to see learned patterns."
}

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

    # --- Continuous Learning prompt (claude target only) ---
    enable_learning_prompt
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

    # --- .cursorrules root file ---
    if [[ -f "$SCRIPT_DIR/.cursorrules" ]]; then
        echo "Installing .cursorrules -> .cursorrules"
        cp "$SCRIPT_DIR/.cursorrules" ".cursorrules"
    fi

    echo "Done. Cursor configs installed to $DEST_DIR/"
    echo "Tip: Add .cursor/ and .cursorrules to .gitignore or commit for team sharing."
fi

# --- OpenCode target ---
if [[ "$TARGET" == "opencode" ]]; then
    OC_SRC="$SCRIPT_DIR/.opencode"
    OC_DEST=".opencode"

    if [[ ! -d "$OC_SRC" ]]; then
        echo "Error: .opencode/ source directory not found at $SCRIPT_DIR" >&2
        exit 1
    fi

    echo "Installing OpenCode configs to $OC_DEST/"

    # Commands (all of them)
    if [[ -d "$OC_SRC/commands" ]]; then
        echo "Installing commands -> $OC_DEST/commands/"
        mkdir -p "$OC_DEST/commands"
        cp -r "$OC_SRC/commands/." "$OC_DEST/commands/"
    fi

    # Agent prompts
    if [[ -d "$OC_SRC/prompts" ]]; then
        echo "Installing agent prompts -> $OC_DEST/prompts/"
        mkdir -p "$OC_DEST/prompts"
        cp -r "$OC_SRC/prompts/." "$OC_DEST/prompts/"
    fi

    # Instructions (rules)
    if [[ -d "$OC_SRC/instructions" ]]; then
        echo "Installing instructions -> $OC_DEST/instructions/"
        mkdir -p "$OC_DEST/instructions"
        cp -r "$OC_SRC/instructions/." "$OC_DEST/instructions/"

        # Also install language-specific rules as instructions
        for lang in "$@"; do
            if [[ ! "$lang" =~ ^[a-zA-Z0-9_-]+$ ]]; then continue; fi
            lang_dir="$RULES_DIR/$lang"
            if [[ -d "$lang_dir" ]]; then
                echo "Installing $lang rules as instructions -> $OC_DEST/instructions/$lang/"
                mkdir -p "$OC_DEST/instructions/$lang"
                cp -r "$lang_dir/." "$OC_DEST/instructions/$lang/"
            fi
        done
    fi

    # Config files
    for f in opencode.json package.json tsconfig.json index.ts; do
        if [[ -f "$OC_SRC/$f" ]]; then
            cp "$OC_SRC/$f" "$OC_DEST/$f"
        fi
    done

    echo "Done. OpenCode configs installed to $OC_DEST/"
    echo "Tip: Add .opencode/ to your project's .gitignore or commit it for team sharing."
fi

# --- Codex target ---
if [[ "$TARGET" == "codex" ]]; then
    CODEX_SRC="$SCRIPT_DIR/codex"
    CODEX_DEST="codex"

    if [[ ! -d "$CODEX_SRC" ]]; then
        echo "Error: codex/ source directory not found at $SCRIPT_DIR" >&2
        exit 1
    fi

    echo "Installing Codex CLI configs to $CODEX_DEST/"

    # Instructions (global rules)
    if [[ -f "$CODEX_SRC/instructions.md" ]]; then
        echo "Installing instructions -> $CODEX_DEST/instructions.md"
        mkdir -p "$CODEX_DEST"
        cp "$CODEX_SRC/instructions.md" "$CODEX_DEST/instructions.md"
    fi

    # Commands
    if [[ -d "$CODEX_SRC/commands" ]]; then
        echo "Installing commands -> $CODEX_DEST/commands/"
        mkdir -p "$CODEX_DEST/commands"
        cp -r "$CODEX_SRC/commands/." "$CODEX_DEST/commands/"
    fi

    echo "Done. Codex CLI configs installed to $CODEX_DEST/"
    echo "Tip: Add codex/ to your project's .gitignore or commit it for team sharing."
fi
