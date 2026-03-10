---
name: cli-ux
description: "CLI user experience patterns: error messages that guide (not just report), help text design, autocomplete setup, config file hierarchy (~/.config/<tool>), environment variable conventions, --json/--quiet/--verbose flags, and progress indication. The difference between a tool people tolerate and one they recommend."
---

# CLI UX Skill

## When to Activate

- Writing error messages for a CLI tool
- Designing `--help` output or man pages
- Adding config file support or env-var overrides
- Implementing autocomplete for shell (bash/zsh/fish)
- Adding spinners or progress bars
- Reviewing the UX of an existing CLI tool
- Designing the initial UX for a new CLI tool where flag naming, config hierarchy, and output format decisions have long-term consequences
- Auditing a CLI that developers find hard to use or frequently get wrong — focusing on error message quality and help text clarity
- Adding `--json` and `--quiet` output modes so a CLI can be scripted and piped without breaking human-readable output

---

## Error Message Design

Good error messages tell users what went wrong **and what to do next**.

### Format

```
error: <what went wrong>
hint:  <what the user should do>

See: https://docs.example.com/errors/<code>
```

### Examples

```
# Bad — reports the internal exception
Error: ENOENT: no such file or directory, open '/etc/config.json'

# Good — explains context and gives next step
error: config file not found at /etc/config.json
hint:  run `tool init` to create a default config, or pass --config <path>
```

```
# Bad — cryptic status code
Error: 401

# Good — actionable
error: authentication failed (401)
hint:  your API token may be expired. Run `tool auth login` to re-authenticate.
```

### Error message checklist

- Start with `error:` (lowercase) for the problem statement
- Add `hint:` on the next line with the recommended action
- Include relevant values (the path that was missing, the token that failed)
- Link to docs for complex errors
- Exit with code 1 for runtime errors, 2 for usage errors
- Never print a raw stack trace to users — log it to a debug file instead

---

## Help Text Design

Every command's `--help` must follow this structure:

```
Usage: tool <command> [options]

  One-sentence description of what this command does.

Options:
  --output, -o <file>   Output file path  [default: stdout]
  --format <fmt>        Output format: json|table|csv  [default: table]
  --verbose, -v         Enable verbose logging
  --quiet, -q           Suppress all output except errors
  --json                Output as machine-readable JSON
  --help, -h            Show this help message

Examples:
  tool export --output report.json --format json
  tool export --quiet | jq '.users[]'
```

### Rules

- **Usage line first** — always show the command signature
- **Description in one sentence** — users scan, they don't read
- **Default values** — always show `[default: x]` for options with defaults
- **Examples at the end** — concrete, copy-pasteable examples are the most-read section
- **No jargon** — use plain language; avoid internal code names
- **Consistent option ordering** — most-used options first

---

## Config File Hierarchy

Apply settings in this priority order (highest first):

```
1. CLI flags              --output ./report.json
2. Environment variables  MY_TOOL_OUTPUT=./report.json
3. Project config         ./.mytool.json  or  ./.mytool/config.json
4. User config            ~/.config/mytool/config.json  ($XDG_CONFIG_HOME/mytool/)
5. System config          /etc/mytool/config.json
6. Built-in defaults
```

### Implementation (Node.js)

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

interface Config {
  output: string;
  format: 'json' | 'table' | 'csv';
  token?: string;
}

const DEFAULT_CONFIG: Config = { output: 'stdout', format: 'table' };

function loadConfig(cliFlags: Partial<Config>): Config {
  const userConfigPath = join(
    process.env.XDG_CONFIG_HOME ?? join(os.homedir(), '.config'),
    'mytool',
    'config.json',
  );

  const projectConfigPath = join(process.cwd(), '.mytool.json');

  const userConfig = existsSync(userConfigPath)
    ? JSON.parse(readFileSync(userConfigPath, 'utf-8'))
    : {};

  const projectConfig = existsSync(projectConfigPath)
    ? JSON.parse(readFileSync(projectConfigPath, 'utf-8'))
    : {};

  const envConfig = {
    ...(process.env.MY_TOOL_OUTPUT && { output: process.env.MY_TOOL_OUTPUT }),
    ...(process.env.MY_TOOL_FORMAT && { format: process.env.MY_TOOL_FORMAT }),
    ...(process.env.MY_TOOL_TOKEN && { token: process.env.MY_TOOL_TOKEN }),
  };

  // Merge in priority order: defaults < user < project < env < CLI flags
  return { ...DEFAULT_CONFIG, ...userConfig, ...projectConfig, ...envConfig, ...cliFlags };
}
```

---

## Environment Variable Conventions

| Naming rule | Example |
|---|---|
| All uppercase | `MY_TOOL_TOKEN` |
| Prefix with tool name | `MY_TOOL_` (not `TOKEN`) |
| Underscore-separated | `MY_TOOL_OUTPUT_FORMAT` |
| No abbreviations | `MY_TOOL_TIMEOUT` (not `MY_TOOL_TO`) |

### Standard env vars to support

```
MY_TOOL_TOKEN       # Auth token (avoids --token flag in shell history)
MY_TOOL_CONFIG      # Override config file path
MY_TOOL_LOG_LEVEL   # debug|info|warn|error
MY_TOOL_NO_COLOR    # Disable colored output (honour this if set to any value)
NO_COLOR            # Standard cross-tool convention (https://no-color.org)
```

### Document env vars in `--help`

```
Environment Variables:
  MY_TOOL_TOKEN    API token (alternative to --token)
  MY_TOOL_CONFIG   Config file path (alternative to --config)
  NO_COLOR         Disable colored output
```

---

## Autocomplete

Shell autocomplete dramatically improves discoverability.

### Node.js — yargs built-in

```typescript
// yargs generates completions automatically
yargs(hideBin(process.argv))
  .completion('completion', 'Generate shell completion script')
  .argv;

// Install: tool completion >> ~/.zshrc
```

### Python — click built-in

```bash
# click generates completions for bash/zsh/fish
_MY_TOOL_COMPLETE=bash_source my-tool >> ~/.bashrc
_MY_TOOL_COMPLETE=zsh_source my-tool >> ~/.zshrc
_MY_TOOL_COMPLETE=fish_source my-tool > ~/.config/fish/completions/my-tool.fish
```

### Go — cobra built-in

```go
// cobra has a built-in completion command
rootCmd.AddCommand(completionCmd)

var completionCmd = &cobra.Command{
  Use:   "completion [bash|zsh|fish|powershell]",
  Short: "Generate shell completion script",
  RunE: func(cmd *cobra.Command, args []string) error {
    switch args[0] {
    case "bash":   return rootCmd.GenBashCompletion(os.Stdout)
    case "zsh":    return rootCmd.GenZshCompletion(os.Stdout)
    case "fish":   return rootCmd.GenFishCompletion(os.Stdout, true)
    default:       return fmt.Errorf("unsupported shell: %s", args[0])
    }
  },
}
```

### Rust — clap built-in

```rust
use clap_complete::{generate, Shell};

// Add completion subcommand
fn generate_completion(shell: Shell) {
    let mut cmd = Cli::command();
    generate(shell, &mut cmd, "my-tool", &mut io::stdout());
}
```

### Document installation in README

```markdown
## Shell Completion

```bash
# bash
tool completion bash >> ~/.bashrc

# zsh
tool completion zsh >> ~/.zshrc

# fish
tool completion fish > ~/.config/fish/completions/tool.fish
```
```

---

## Progress Indication

### Spinner — unknown duration

```typescript
// Node.js — ora
import ora from 'ora';

const spinner = ora('Fetching data…').start();
try {
  const data = await fetchData();
  spinner.succeed('Data fetched');
} catch (error) {
  spinner.fail(`Failed: ${error.message}`);
  process.exit(1);
}
```

```python
# Python — rich
from rich.console import Console

console = Console()
with console.status("Fetching data..."):
    data = fetch_data()
console.print("[green]Done![/green]")
```

### Progress bar — known steps

```typescript
// Node.js — cli-progress
import { SingleBar, Presets } from 'cli-progress';

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(totalFiles, 0);

for (const file of files) {
  await processFile(file);
  bar.increment();
}
bar.stop();
```

### `--no-progress` flag

Always provide a way to disable progress output (important for CI and piping):

```typescript
if (!argv.noProgress && process.stdout.isTTY) {
  const spinner = ora('Processing…').start();
  // ...
}
```

---

## Summary: The 10 UX Rules

1. **Error messages answer "now what?"** — always add a `hint:` line
2. **`--help` examples are mandatory** — copy-pasteable, at the end
3. **Config hierarchy is always the same** — CLI flag > env var > project > user > default
4. **Env vars are prefixed and UPPERCASED** — `MY_TOOL_TOKEN`, not `TOKEN`
5. **Autocomplete ships in v1** — not a nice-to-have
6. **Spinner for unknown wait, bar for known progress**
7. **`--no-progress` for CI** — spinners in CI logs are noise
8. **`NO_COLOR` is honoured** — use the standard, do not invent your own
9. **Errors to stderr, data to stdout** — always, no exceptions
10. **TTY check before interactive prompts** — never block a pipe waiting for input

---

## Checklist

- [ ] Error messages have `error:` + `hint:` lines
- [ ] No raw stack traces in user-facing output
- [ ] `--help` has Usage, Description, Options with defaults, and Examples sections
- [ ] Config hierarchy implemented: CLI > env > project > user > defaults
- [ ] Env vars prefixed with tool name and documented in `--help`
- [ ] `NO_COLOR` respected
- [ ] Autocomplete command added (`completion bash|zsh|fish`)
- [ ] Spinner used for unknown-duration operations
- [ ] Progress bar used for known-step operations
- [ ] `--no-progress` flag available for CI environments
- [ ] TTY check before interactive prompts
