---
description: Set up Cursor IDE integration for clarc — creates .cursor/rules/ files for all installed languages and generates .cursorrules from common rules.
---

# Cursor Setup

This command installs clarc language rules into your project for use with Cursor IDE.

## What It Does

1. Detects which languages are present in your project (by file extension)
2. Copies the matching `.cursor/rules/<lang>-*.md` files into your project's `.cursor/rules/`
3. Copies `.cursorrules` (global rules) into the project root
4. Reports which languages were installed

## Usage

Run this in the root of your project (where you want Cursor to pick up the rules):

```bash
# Detect languages automatically and install matching rules
/cursor-setup

# Or install specific languages manually:
./install.sh --target cursor typescript python go
```

## Auto-Detection Logic

The setup detects the following languages by file pattern:

| Extension | Language |
|-----------|----------|
| `.ts`, `.tsx`, `.js`, `.mjs` | typescript |
| `.py` | python |
| `.go` | go |
| `.java` | java |
| `.swift` | swift |
| `.rs` | rust |
| `.cpp`, `.cc`, `.h`, `.hpp` | cpp |
| `.c` | c |
| `.cs`, `.razor` | csharp |
| `.kt`, `.kts` | kotlin |
| `.scala`, `.sc` | scala |
| `.php` | php |
| `.rb`, `.rake` | ruby |
| `.ex`, `.exs` | elixir |
| `.R`, `.Rmd`, `.qmd` | r |
| `.sh`, `.bash`, `.zsh` | bash |
| `.sql` | sql |

## Steps Claude Should Follow

1. **Detect project languages** — run `find . -type f \( -name "*.ts" -o -name "*.py" -o -name "*.go" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | head -100` and determine which language sets are needed

2. **Check clarc is available** — verify `install.sh` exists in the current directory or a parent directory

3. **Run install** for each detected language:
   ```bash
   ./install.sh --target cursor <lang1> <lang2> ...
   ```
   Example: `./install.sh --target cursor typescript python go`

4. **Verify output** — confirm `.cursor/rules/` contains the expected files and `.cursorrules` is present

5. **Report** — show a summary of installed language rule sets

## File Layout After Setup

```
your-project/
  .cursor/
    rules/
      common-coding-style.md
      common-testing.md
      common-patterns.md
      common-security.md
      common-hooks.md
      common-git-workflow.md
      common-performance.md
      common-agents.md
      typescript-coding-style.md
      typescript-testing.md
      ...
  .cursorrules            # Global Cursor config
```

## Notes

- Common rules (applicable to all languages) are always installed
- Language rules are only installed for detected/specified languages
- Cursor reads `.cursor/rules/*.md` automatically for files matching the `paths:` frontmatter
- `.cursorrules` provides global project context to Cursor
- Add `.cursor/` and `.cursorrules` to your `.gitignore` or commit them for team sharing
