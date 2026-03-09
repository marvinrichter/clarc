#!/usr/bin/env bash
# install.sh — Install clarc rules, agents, skills, and commands to your editor/AI tool.
#
# Preferred entry point: npx github:marvinrichter/clarc (interactive wizard)
# This script is the workhorse called by the wizard, or used directly by power users.
#
# Usage:
#   ./install.sh [--target <claude|cursor|opencode|codex>] [<language> ...]
#   ./install.sh --check [<language> ...]
#   ./install.sh --dry-run [<language> ...]
#   ./install.sh --uninstall [<component>]
#   ./install.sh --upgrade
#
# No languages? Project files are auto-detected (package.json, go.mod, Gemfile, etc.)
#
# Examples:
#   ./install.sh                            # auto-detect from project files
#   ./install.sh typescript
#   ./install.sh typescript python go
#   ./install.sh --target cursor typescript
#   ./install.sh --target opencode typescript
#   ./install.sh --target codex
#   ./install.sh --check                    # check common + all installed langs
#   ./install.sh --check typescript python  # check specific languages
#   ./install.sh --dry-run typescript       # preview install without changes
#   ./install.sh --uninstall                # remove all clarc-managed symlinks
#   ./install.sh --uninstall agents         # remove only agent symlinks
#   ./install.sh --upgrade                  # clean orphans + re-install
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

# --- ANSI helpers (only when connected to a terminal) ---
if [[ -t 1 ]]; then
    _BOLD='\033[1m'; _GREEN='\033[32m'; _CYAN='\033[36m'; _DIM='\033[2m'; _RESET='\033[0m'
else
    _BOLD=''; _GREEN=''; _CYAN=''; _DIM=''; _RESET=''
fi

ok()  { echo -e "${_GREEN}✔${_RESET} $*"; }
hdr() { echo -e "\n${_BOLD}$*${_RESET}"; }

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
USE_SYMLINKS=true   # default: symlink files, not copy
TEAM_MODE=false
COMPANY_PREFIX=""
PRIVATE_RULES=""
PRIVATE_SKILLS=""
DRY_RUN=false
UNINSTALL=false
UNINSTALL_COMPONENT=""
UPGRADE=false
YES=false
MANIFEST_TMP=""
MANIFEST_FILE="$SCRIPT_DIR/install-manifest.json"
# On native Windows (Git Bash / Cygwin / MSYS2) symlinks require admin rights → use copy
if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* || "${OSTYPE:-}" == mingw* ]]; then
    USE_SYMLINKS=false
fi

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
            # Common rules go to both ~/.claude/rules/common/ (global) and
            # <cwd>/.claude/rules/common/ (project-local) so that ../common/ relative
            # links inside language rule files resolve correctly.
            PROJECT_LOCAL=true
            shift
            ;;
        --check)
            # Compare installed rules against repo version — do not install anything
            CHECK_ONLY=true
            shift
            ;;
        --copy)
            # Use cp instead of symlinks (for CI, containers, cross-filesystem)
            USE_SYMLINKS=false
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
        --team-mode)
            # Enable team installation mode (shared prefix, private rules/skills)
            TEAM_MODE=true
            shift
            ;;
        --company-prefix)
            # Prefix for team agents/commands directory (e.g. "acme")
            if [[ -z "${2:-}" ]]; then
                echo "Error: --company-prefix requires a value" >&2
                exit 1
            fi
            COMPANY_PREFIX="$2"
            shift 2
            ;;
        --private-rules)
            # Path to directory with private rules to install alongside clarc rules
            if [[ -z "${2:-}" ]]; then
                echo "Error: --private-rules requires a path" >&2
                exit 1
            fi
            PRIVATE_RULES="$2"
            shift 2
            ;;
        --private-skills)
            # Path to directory with private skills to install alongside clarc skills
            if [[ -z "${2:-}" ]]; then
                echo "Error: --private-skills requires a path" >&2
                exit 1
            fi
            PRIVATE_SKILLS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --uninstall)
            UNINSTALL=true
            if [[ -n "${2:-}" && ! "${2:-}" == --* ]]; then
                UNINSTALL_COMPONENT="$2"
                shift
            fi
            shift
            ;;
        --upgrade)
            UPGRADE=true
            shift
            ;;
        --yes|-y)
            YES=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [[ "$CHECK_ONLY" == false && "$UNINSTALL" == false && "$UPGRADE" == false && \
      "$TARGET" != "claude" && "$TARGET" != "cursor" && "$TARGET" != "opencode" && "$TARGET" != "codex" ]]; then
    echo "Error: unknown target '$TARGET'. Must be 'claude', 'cursor', 'opencode', or 'codex'." >&2
    exit 1
fi

# --- Helper: write install manifest after symlink creation ---
# Reads lines written to MANIFEST_TMP (format: src|dst|component) and writes JSON.
write_manifest() {
    [[ "$DRY_RUN" == true || "$USE_SYMLINKS" == false ]] && return 0
    [[ ! -f "${MANIFEST_TMP:-}" ]] && return 0
    local pkg_version
    pkg_version="$(node -e "try{const fs=require('fs');console.log(JSON.parse(fs.readFileSync('$SCRIPT_DIR/package.json','utf8')).version)}catch(e){console.log('unknown')}" 2>/dev/null || echo "unknown")"
    node - "$MANIFEST_FILE" "$pkg_version" "$TARGET" "$MANIFEST_TMP" <<'NODEEOF'
const fs = require('fs');
const [,,manifestFile, version, target, tmpFile] = process.argv;
const content = fs.readFileSync(tmpFile, 'utf8').trim();
const lines = content ? content.split('\n').filter(Boolean) : [];
const symlinks = lines.map(line => {
    const [src, dst, component] = line.split('|');
    return { src, dst, component };
});
const backup = manifestFile.replace('.json', '.backup.json');
if (fs.existsSync(manifestFile)) fs.copyFileSync(manifestFile, backup);
const manifest = { version, installed_at: new Date().toISOString(), target, symlinks };
fs.mkdirSync(require('path').dirname(manifestFile), { recursive: true });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`  Manifest: ${symlinks.length} symlinks tracked → ${manifestFile}`);
NODEEOF
    rm -f "$MANIFEST_TMP"
}

# --- Uninstall handler ---
if [[ "$UNINSTALL" == true ]]; then
    if [[ ! -f "$MANIFEST_FILE" ]]; then
        echo "Error: no install manifest found at $MANIFEST_FILE" >&2
        echo "Cannot uninstall automatically without a manifest." >&2
        echo "To uninstall manually: find ~/.claude/ -type l -lname '*/.clarc/*' -delete" >&2
        exit 1
    fi
    node - "$MANIFEST_FILE" "$UNINSTALL_COMPONENT" "$YES" "$DRY_RUN" <<'NODEEOF'
const fs = require('fs');
const [,,manifestFile, component, yesFlag, dryRunFlag] = process.argv;
const YES = yesFlag === 'true';
const DRY_RUN = dryRunFlag === 'true';

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
let entries = manifest.symlinks || [];
if (component) {
    entries = entries.filter(e => e.component === component);
    if (entries.length === 0) {
        console.error(`No symlinks found for component: ${component}`);
        console.error(`Available components: ${[...new Set((manifest.symlinks||[]).map(e=>e.component))].join(', ')}`);
        process.exit(1);
    }
}

// Filter to only symlinks that still point to a clarc source
const toRemove = entries.filter(e => {
    try {
        const lstat = fs.lstatSync(e.dst);
        if (!lstat.isSymbolicLink()) return false;  // skip non-symlinks (user files)
        const target = fs.readlinkSync(e.dst);
        return target === e.src || target.startsWith(require('os').homedir() + '/.clarc/');
    } catch { return false; }
});

if (toRemove.length === 0) {
    console.log('No clarc-managed symlinks found to remove.');
    process.exit(0);
}

// Print what will be removed
console.log(`\nWill remove ${toRemove.length} symlink(s)${component ? ` (${component})` : ''}:`);
if (!DRY_RUN) {
    for (const e of toRemove.slice(0, 5)) console.log(`  ${e.dst}`);
    if (toRemove.length > 5) console.log(`  ... and ${toRemove.length - 5} more`);
} else {
    for (const e of toRemove) console.log(`  [DRY RUN] would remove: ${e.dst}`);
}

if (DRY_RUN) { console.log('\nDry run complete. No changes made.'); process.exit(0); }

// Confirm unless --yes
if (!YES) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nProceed? [y/N] ', answer => {
        rl.close();
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log('Aborted.'); process.exit(0);
        }
        remove();
    });
} else {
    remove();
}

function remove() {
    let removed = 0;
    for (const e of toRemove) {
        try { fs.unlinkSync(e.dst); removed++; } catch (err) {
            console.warn(`  Warning: could not remove ${e.dst}: ${err.message}`);
        }
    }
    console.log(`\nRemoved ${removed} symlink(s) from ~/.claude/`);
    if (!component) {
        // Full uninstall: backup manifest, clear symlinks list
        const backup = manifestFile.replace('.json', '.backup.json');
        fs.copyFileSync(manifestFile, backup);
        const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
        m.symlinks = [];
        m.uninstalled_at = new Date().toISOString();
        fs.writeFileSync(manifestFile, JSON.stringify(m, null, 2) + '\n');
        console.log('Manifest cleared. Backup saved to install-manifest.backup.json');
    }
}
NODEEOF
    exit $?
fi

# --- Upgrade handler: detect orphan symlinks, remove them, then re-install ---
if [[ "$UPGRADE" == true ]]; then
    hdr "Upgrade — cleaning orphan symlinks"
    CLAUDE_AGENTS_DIR_UP="$HOME/.claude/agents"
    CLAUDE_COMMANDS_DIR_UP="$HOME/.claude/commands"
    CLAUDE_RULES_DIR_UP="${CLAUDE_RULES_DIR:-$HOME/.claude/rules}"

    orphan_count=0
    for dir in "$CLAUDE_AGENTS_DIR_UP" "$CLAUDE_COMMANDS_DIR_UP" "$CLAUDE_RULES_DIR_UP"; do
        [[ -d "$dir" ]] || continue
        while IFS= read -r -d '' link; do
            target="$(readlink "$link" 2>/dev/null || true)"
            if [[ "$target" == *"/.clarc/"* && ! -e "$link" ]]; then
                echo "  Removing orphan: $link"
                rm "$link"
                orphan_count=$((orphan_count + 1))
            fi
        done < <(find "$dir" -maxdepth 2 -type l -print0 2>/dev/null)
    done

    if [[ $orphan_count -eq 0 ]]; then
        ok "No orphan symlinks found"
    else
        ok "Removed $orphan_count orphan symlink(s)"
    fi

    echo ""
    echo "Re-installing…"
    exec bash "$0" "${@}"
fi

# --- Auto-detect languages from project files in $PWD ---
detect_languages() {
    local cwd="$PWD"
    local detected=()

    # TypeScript / JavaScript
    [[ -f "$cwd/tsconfig.json" || -f "$cwd/package.json" ]] && detected+=(typescript)
    # Python
    [[ -f "$cwd/pyproject.toml" || -f "$cwd/requirements.txt" || -f "$cwd/setup.py" || -f "$cwd/Pipfile" ]] && detected+=(python)
    # Go
    [[ -f "$cwd/go.mod" ]] && detected+=(go)
    # Java: Maven or Groovy Gradle; build.gradle.kts alone is ambiguous — only Java if no settings.gradle.kts
    if [[ -f "$cwd/pom.xml" || -f "$cwd/build.gradle" ]] || \
       [[ -f "$cwd/build.gradle.kts" && ! -f "$cwd/settings.gradle.kts" ]]; then
        detected+=(java)
    fi
    # Kotlin: settings.gradle.kts is the Kotlin DSL discriminating marker
    [[ -f "$cwd/settings.gradle.kts" ]] && detected+=(kotlin)
    # Rust
    [[ -f "$cwd/Cargo.toml" ]] && detected+=(rust)
    # Swift
    [[ -f "$cwd/Package.swift" ]] && detected+=(swift)
    # Ruby
    [[ -f "$cwd/Gemfile" ]] && detected+=(ruby)
    # Elixir
    [[ -f "$cwd/mix.exs" ]] && detected+=(elixir)
    # C++
    [[ -f "$cwd/CMakeLists.txt" ]] && detected+=(cpp)
    # PHP
    [[ -f "$cwd/composer.json" ]] && detected+=(php)
    # Scala
    [[ -f "$cwd/build.sbt" ]] && detected+=(scala)
    # R
    [[ -f "$cwd/DESCRIPTION" || -f "$cwd/renv.lock" ]] && detected+=(r)
    # C#
    [[ -f "$cwd/global.json" ]] && detected+=(csharp)
    # Kotlin (Gradle without Java marker already covered above; standalone Kotlin projects)
    [[ -f "$cwd/settings.gradle.kts" ]] && ! printf '%s\n' "${detected[@]}" | grep -q '^java$' && detected+=(kotlin)
    # Flutter / Dart
    [[ -f "$cwd/pubspec.yaml" ]] && detected+=(flutter)
    # SQL / dbt
    [[ -f "$cwd/dbt_project.yml" || -f "$cwd/.sqlfluff" ]] && detected+=(sql)

    echo "${detected[@]:-}"
}

# --- Install helper: symlink (default) or copy .md files from src_dir into dest_dir ---
# Existing user-created non-symlink files are preserved (never overwritten).
# Exception: if a non-symlink file is byte-for-byte identical to the source (old copy),
# it is replaced with a symlink so future updates work automatically.
# $4 = component name for manifest tracking (e.g. agents, commands, rules)
install_files() {
    local src_dir="$1"
    local dest_dir="$2"
    local label="$3"
    local component="${4:-other}"
    [[ -d "$src_dir" ]] || return 0
    [[ "$DRY_RUN" == false ]] && mkdir -p "$dest_dir"
    local count=0
    for f in "$src_dir"/*.md; do
        [[ -f "$f" ]] || continue
        local name dest
        name="$(basename "$f")"
        dest="$dest_dir/$name"
        # Non-symlink exists: only skip if content differs (= user customization).
        # If content matches the source it's an old clarc copy → replace with symlink.
        if [[ -e "$dest" && ! -L "$dest" ]]; then
            if cmp -s "$f" "$dest"; then
                [[ "$DRY_RUN" == false ]] && rm "$dest"
            else
                echo "  skip $name (custom file, content differs — not overwriting)"
                continue
            fi
        fi
        if [[ "$DRY_RUN" == true ]]; then
            echo "  [DRY RUN] would create: $dest ← $f"
        elif [[ "$USE_SYMLINKS" == true ]]; then
            ln -sf "$f" "$dest"
            echo "${f}|${dest}|${component}" >> "$MANIFEST_TMP"
        else
            cp "$f" "$dest"
        fi
        count=$((count + 1))
    done
    [[ $count -gt 0 ]] && ok "$label  →  $dest_dir/  ($count files)"
}

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

# --- Auto-detect or show usage when no languages provided ---
if [[ $# -eq 0 ]]; then
    detected_langs=($(detect_languages))
    if [[ ${#detected_langs[@]} -gt 0 ]]; then
        echo -e "${_CYAN}Auto-detected:${_RESET} ${detected_langs[*]}"
        set -- "${detected_langs[@]}"
    else
        echo "Usage: $0 [--target <claude|cursor|opencode|codex>] [--project] <language> [<language> ...]"
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
        echo ""
        echo "Tip: run 'npx clarc-install' for an interactive setup wizard."
        exit 1
    fi
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
    GLOBAL_RULES_DIR="${CLAUDE_RULES_DIR:-$HOME/.claude/rules}"
    CLAUDE_AGENTS_DIR="$HOME/.claude/agents"
    CLAUDE_COMMANDS_DIR="$HOME/.claude/commands"

    if [[ "$PROJECT_LOCAL" == true ]]; then
        LANG_DEST_DIR="$(pwd)/.claude/rules"
    else
        LANG_DEST_DIR="$GLOBAL_RULES_DIR"
    fi

    local_verb="symlinked"
    [[ "$USE_SYMLINKS" == false ]] && local_verb="copied"
    [[ "$DRY_RUN" == true ]] && local_verb="preview (dry run)"

    # Initialize manifest temp file for this install session
    if [[ "$USE_SYMLINKS" == true && "$DRY_RUN" == false ]]; then
        MANIFEST_TMP="$(mktemp)"
    fi

    # --- Rules ---
    hdr "Rules ($local_verb)"
    install_files "$RULES_DIR/common" "$GLOBAL_RULES_DIR/common" "common" "rules"
    # When installing project-locally, also symlink common into the project so that
    # relative references (../common/coding-style.md) in language rules resolve correctly.
    if [[ "$PROJECT_LOCAL" == true ]]; then
        install_files "$RULES_DIR/common" "$LANG_DEST_DIR/common" "common (project-local)" "rules"
    fi
    for lang in "$@"; do
        if [[ ! "$lang" =~ ^[a-zA-Z0-9_-]+$ ]]; then
            echo "Error: invalid language name '$lang'." >&2; continue
        fi
        if [[ ! -d "$RULES_DIR/$lang" ]]; then
            echo "Warning: rules/$lang/ not found, skipping." >&2; continue
        fi
        install_files "$RULES_DIR/$lang" "$LANG_DEST_DIR/$lang" "$lang" "rules"
    done

    # --- Agents ---
    hdr "Agents ($local_verb)"
    install_files "$SCRIPT_DIR/agents" "$CLAUDE_AGENTS_DIR" "agents" "agents"

    # --- Commands ---
    hdr "Commands ($local_verb)"
    install_files "$SCRIPT_DIR/commands" "$CLAUDE_COMMANDS_DIR" "commands" "commands"

    if [[ "$USE_SYMLINKS" == true ]]; then
        echo ""
        echo -e "  ${_DIM}Files are symlinked → \`git pull\` in ~/.clarc updates everything automatically.${_RESET}"
        echo -e "  ${_DIM}To override a file: replace the symlink with your own version.${_RESET}"
    fi

    # --- Team-mode: private rules + skills ---
    if [[ "$TEAM_MODE" == true ]]; then
        hdr "Team mode"
        local prefix_suffix=""
        [[ -n "$COMPANY_PREFIX" ]] && prefix_suffix=" (prefix: $COMPANY_PREFIX)"
        echo "  Team installation enabled${prefix_suffix}"

        if [[ -n "$PRIVATE_RULES" ]]; then
            if [[ -d "$PRIVATE_RULES" ]]; then
                PRIVATE_RULES_DEST="$GLOBAL_RULES_DIR/private"
                [[ -n "$COMPANY_PREFIX" ]] && PRIVATE_RULES_DEST="$GLOBAL_RULES_DIR/$COMPANY_PREFIX"
                install_files "$PRIVATE_RULES" "$PRIVATE_RULES_DEST" "private-rules" "rules"
            else
                echo "  Warning: --private-rules path not found: $PRIVATE_RULES" >&2
            fi
        fi

        if [[ -n "$PRIVATE_SKILLS" ]]; then
            PRIVATE_SKILLS_DEST="$HOME/.claude/skills"
            [[ -n "$COMPANY_PREFIX" ]] && PRIVATE_SKILLS_DEST="$HOME/.claude/skills/$COMPANY_PREFIX"
            if [[ -d "$PRIVATE_SKILLS" ]]; then
                mkdir -p "$PRIVATE_SKILLS_DEST"
                for skill_dir in "$PRIVATE_SKILLS"/*/; do
                    [[ -d "$skill_dir" ]] || continue
                    skill_name="$(basename "$skill_dir")"
                    dest_skill="$PRIVATE_SKILLS_DEST/$skill_name"
                    if [[ "$USE_SYMLINKS" == true ]]; then
                        ln -sfn "$skill_dir" "$dest_skill"
                    else
                        cp -r "$skill_dir" "$dest_skill"
                    fi
                    ok "private-skill/$skill_name  →  $dest_skill"
                done
            else
                echo "  Warning: --private-skills path not found: $PRIVATE_SKILLS" >&2
            fi
        fi

        echo ""
        echo "  Team setup complete. Share this command with your team:"
        echo "  ./install.sh --team-mode${COMPANY_PREFIX:+ --company-prefix $COMPANY_PREFIX}${PRIVATE_RULES:+ --private-rules $PRIVATE_RULES}${PRIVATE_SKILLS:+ --private-skills $PRIVATE_SKILLS} <language>"
    fi

    # --- Continuous Learning prompt (claude target only) ---
    [[ "$DRY_RUN" == false ]] && enable_learning_prompt

    # --- Write install manifest ---
    write_manifest

    # --- Record installed rules version ---
    # Copies rules/RULES_VERSION to ~/.clarc/installed-rules-version so /doctor
    # and the session-start staleness banner can compare against upstream.
    if [[ "$DRY_RUN" == false && -f "$RULES_DIR/RULES_VERSION" ]]; then
        cp "$RULES_DIR/RULES_VERSION" "$SCRIPT_DIR/installed-rules-version" 2>/dev/null || true
        ok "Rules version: $(cat "$RULES_DIR/RULES_VERSION" | tr -d '[:space:]') recorded"
    fi

    if [[ "$DRY_RUN" == true ]]; then
        echo ""
        echo -e "  ${_CYAN}Dry run complete — no changes were made.${_RESET}"
        echo -e "  ${_DIM}Re-run without --dry-run to install.${_RESET}"
        echo ""
        exit 0
    fi

    # --- Next steps ---
    hdr "Next steps"
    echo "  • Use commands: /tdd  /plan  /code-review  /verify"
    echo "  • Update: cd ~/.clarc && git pull  (symlinks update instantly)"
    echo "  • Activate hooks: merge hooks/hooks.json into ~/.claude/settings.json"
    echo "  • Check for updates: ./install.sh --check"
    echo "  • Uninstall: ./install.sh --uninstall"
    echo "  • Docs:  https://github.com/marvinrichter/clarc"
    echo ""
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
