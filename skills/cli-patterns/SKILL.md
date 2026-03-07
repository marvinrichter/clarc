---
name: cli-patterns
description: "CLI tool design patterns for Node.js (yargs/commander), Python (click/typer/argparse), Go (cobra/pflag), and Rust (clap). Covers argument design, subcommand structure, interactive prompts (inquirer/Ratatui), progress bars, exit codes, stdin/stdout/stderr composability, and --json output. Use when building any command-line tool."
---

# CLI Patterns Skill

## When to Activate

- Building a new CLI tool or adding subcommands to an existing one
- Designing the argument interface (flags, options, positional args)
- Implementing `--json` output, `--quiet`, or `--verbose` modes
- Adding interactive prompts or progress indicators
- Writing subprocess-based CLI tests
- Debugging composability issues (piping, stdin, exit codes)

---

## Argument Design

### Flags vs. Options vs. Positional Args

| Type | Form | Use when |
|------|------|----------|
| Positional arg | `tool <input>` | Required, single primary target |
| Option (value) | `--output file.json` | Named parameter with value |
| Flag (boolean) | `--verbose` | Toggle behaviour on/off |

### Key principles

- **Required options** should be positional args — flags are always optional by convention
- **Defaults**: provide sensible defaults; document them in `--help`
- **Env-var overrides**: every flag should be overridable via env var (`--token` → `MY_TOOL_TOKEN`)
- **Short aliases**: only add `-x` shorthand for frequently used flags (`-v` for `--verbose`, `-o` for `--output`)
- **`--no-` prefix**: boolean flags should support `--no-flag` to negate (`--no-color`)

---

## Subcommand Structure

### Noun-Verb vs. Verb-Noun

```
# Noun-Verb (preferred — git-style)
tool resource action
tool user create
tool user list
tool deploy start

# Verb-Noun (alternative — Heroku-style)
tool create-user
tool list-users
```

Noun-Verb is preferred for tools with many resource types. Verb-Noun works for small tools with few commands.

### Global vs. local flags

```
tool --config ./config.yml user create --name Alice
      ↑ global flag                     ↑ local (subcommand) flag
```

Global flags apply to all subcommands. Local flags apply only to their subcommand. Document both in each subcommand's `--help`.

### Help inheritance

Every subcommand must show:
1. Usage line
2. Short description (one sentence)
3. Available options with defaults
4. At least one example

---

## Interactive Prompts

### When to use interactive mode

Only use interactive prompts when running attached to a TTY:

```typescript
// Node.js — detect TTY before prompting
if (!process.stdin.isTTY) {
  console.error('error: interactive mode requires a TTY. Use --name flag for non-interactive usage.');
  process.exit(2);
}
```

### Node.js — inquirer

```typescript
import { input, select, confirm } from '@inquirer/prompts';

const name = await input({ message: 'Project name:', default: 'my-app' });
const template = await select({
  message: 'Template:',
  choices: [
    { name: 'TypeScript', value: 'ts' },
    { name: 'Python', value: 'py' },
    { name: 'Go', value: 'go' },
  ],
});
const proceed = await confirm({ message: `Create ${name} with ${template}?`, default: true });
```

### Python — questionary

```python
import sys
import questionary

if not sys.stdin.isatty():
    print("error: interactive mode requires a TTY", file=sys.stderr)
    sys.exit(2)

name = questionary.text("Project name:", default="my-app").ask()
template = questionary.select("Template:", choices=["ts", "py", "go"]).ask()
proceed = questionary.confirm(f"Create {name} with {template}?", default=True).ask()
```

### Go — promptui

```go
import "github.com/manifoldco/promptui"

prompt := promptui.Prompt{Label: "Project name", Default: "my-app"}
name, err := prompt.Run()

sel := promptui.Select{Label: "Template", Items: []string{"ts", "py", "go"}}
_, template, err := sel.Run()
```

### Rust — dialoguer

```rust
use dialoguer::{Input, Select, Confirm};

let name: String = Input::new().with_prompt("Project name").default("my-app".into()).interact_text()?;
let templates = &["ts", "py", "go"];
let template_idx = Select::new().with_prompt("Template").items(templates).interact()?;
let proceed = Confirm::new().with_prompt(format!("Create {} with {}?", name, templates[template_idx])).interact()?;
```

---

## Output Formatting

### `--json` flag

Always support `--json` for machine-readable output. Structured output enables piping to `jq` and scripting.

```typescript
// Node.js / yargs
import yargs from 'yargs';

const argv = yargs(process.argv.slice(2))
  .option('json', { type: 'boolean', describe: 'Output as JSON', default: false })
  .argv;

if (argv.json) {
  console.log(JSON.stringify({ status: 'ok', users }, null, 2));
} else {
  console.table(users);
}
```

```python
# Python / click
import click, json

@click.command()
@click.option('--json', 'output_json', is_flag=True, help='Output as JSON')
def list_users(output_json):
    users = fetch_users()
    if output_json:
        click.echo(json.dumps(users, indent=2))
    else:
        for u in users:
            click.echo(f"{u['name']:<20} {u['email']}")
```

### `--quiet` and `--verbose`

```typescript
// Respect these flags globally
if (!argv.quiet) console.log('Processing...');
if (argv.verbose) console.log('Debug:', details);
```

### Colored output with TTY check

```typescript
import chalk from 'chalk';

// Only colorize when writing to a terminal, not when piped
const isColorEnabled = process.stdout.isTTY && !process.env.NO_COLOR;
const error = isColorEnabled ? chalk.red('error') : 'error';
```

### Table output

```typescript
// Node.js — cli-table3
import Table from 'cli-table3';

const table = new Table({ head: ['Name', 'Email', 'Role'] });
users.forEach(u => table.push([u.name, u.email, u.role]));
console.log(table.toString());
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (runtime failure, API error) |
| `2` | Usage error (bad arguments, missing required flag) |
| `3+` | Tool-specific codes — document in README |

```typescript
// Always exit explicitly with the right code
process.exit(0);   // success
process.exit(1);   // runtime error
process.exit(2);   // usage error (yargs does this automatically for arg errors)
```

---

## Composability (Unix Philosophy)

### Read from stdin

```typescript
// Node.js — read stdin when no file arg provided
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const input = argv.file
  ? createReadStream(argv.file)
  : process.stdin;

const rl = createInterface({ input });
rl.on('line', (line) => processLine(line));
```

```python
# Python — click handles stdin automatically
@click.argument('file', type=click.File('r'), default='-')
def process(file):
    for line in file:
        process_line(line.rstrip())
```

### Write errors to stderr, data to stdout

```typescript
// stdout — machine-readable output (for piping)
console.log(JSON.stringify(result));

// stderr — human-readable status, errors (does not pollute pipes)
console.error(`error: ${message}`);
```

### `--` separator

Support `--` to terminate flag parsing:

```
tool run --verbose -- --some-flag-for-subprocess
```

yargs, cobra, and clap support this automatically.

---

## Minimal CLI Examples

### Node.js — yargs

```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command(
    'create <name>',
    'Create a new project',
    (yargs) => yargs
      .positional('name', { type: 'string', describe: 'Project name' })
      .option('template', { type: 'string', default: 'ts', describe: 'Project template' })
      .option('json', { type: 'boolean', default: false }),
    async (argv) => {
      const result = await createProject(argv.name!, argv.template);
      if (argv.json) {
        console.log(JSON.stringify(result));
      } else {
        console.log(`Created project: ${argv.name}`);
      }
    },
  )
  .demandCommand()
  .strict()
  .help()
  .argv;
```

### Python — click

```python
import click

@click.group()
def cli():
    """Project management tool."""
    pass

@cli.command()
@click.argument('name')
@click.option('--template', default='ts', show_default=True, help='Project template')
@click.option('--json', 'output_json', is_flag=True, help='Output as JSON')
def create(name, template, output_json):
    """Create a new project."""
    result = create_project(name, template)
    if output_json:
        click.echo(json.dumps(result))
    else:
        click.echo(f"Created project: {name}")

if __name__ == '__main__':
    cli()
```

### Go — cobra

```go
package main

import (
  "encoding/json"
  "fmt"
  "github.com/spf13/cobra"
)

var jsonOutput bool
var template string

var createCmd = &cobra.Command{
  Use:   "create <name>",
  Short: "Create a new project",
  Args:  cobra.ExactArgs(1),
  RunE: func(cmd *cobra.Command, args []string) error {
    result, err := createProject(args[0], template)
    if err != nil {
      return err
    }
    if jsonOutput {
      data, _ := json.MarshalIndent(result, "", "  ")
      fmt.Println(string(data))
    } else {
      fmt.Printf("Created project: %s\n", args[0])
    }
    return nil
  },
}

func init() {
  createCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output as JSON")
  createCmd.Flags().StringVar(&template, "template", "ts", "Project template")
  rootCmd.AddCommand(createCmd)
}
```

### Rust — clap

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "tool", about = "Project management tool")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Create {
        name: String,
        #[arg(long, default_value = "ts")]
        template: String,
        #[arg(long)]
        json: bool,
    },
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Commands::Create { name, template, json } => {
            let result = create_project(&name, &template);
            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap());
            } else {
                println!("Created project: {}", name);
            }
        }
    }
}
```

---

## Testing CLI Tools

### Subprocess tests (recommended)

```typescript
// Node.js — spawn and capture output
import { spawnSync } from 'child_process';

test('create command outputs JSON', () => {
  const result = spawnSync('node', ['./dist/cli.js', 'create', 'my-app', '--json'], {
    encoding: 'utf-8',
  });
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.name).toBe('my-app');
});

test('exits with code 2 on missing arg', () => {
  const result = spawnSync('node', ['./dist/cli.js', 'create'], { encoding: 'utf-8' });
  expect(result.status).toBe(2);
});
```

```python
# Python — subprocess + pytest
import subprocess, json

def test_create_json():
    result = subprocess.run(
        ['python', '-m', 'tool', 'create', 'my-app', '--json'],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    output = json.loads(result.stdout)
    assert output['name'] == 'my-app'

def test_missing_arg_exits_2():
    result = subprocess.run(['python', '-m', 'tool', 'create'], capture_output=True)
    assert result.returncode == 2
```

---

## Checklist

- [ ] Positional args for required inputs; flags for optional ones
- [ ] Every flag documented in `--help` with type and default
- [ ] Env-var override supported for config values
- [ ] `--json` flag outputs valid JSON to stdout
- [ ] Errors go to stderr; data goes to stdout
- [ ] TTY check before interactive prompts
- [ ] Colored output disabled when `NO_COLOR` env var is set or stdout is not a TTY
- [ ] Exit code 2 for usage errors, 1 for runtime errors, 0 for success
- [ ] `--` separator supported for pass-through args
- [ ] Subprocess tests cover happy path and error exit codes
