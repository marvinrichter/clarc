---
description: "Ruby development hooks — RuboCop auto-format, Brakeman security"
globs: ["**/*.rb"]
alwaysApply: false
---
# Ruby Hooks

After editing Ruby files, run:

```bash
rubocop --autocorrect --no-color <file>
```

Or use StandardRB:

```bash
standardrb --fix <file>
```

Security check before commit:

```bash
brakeman --quiet --no-progress
bundle audit check --update
```
