---
description: Audit a codebase for i18n completeness — find hardcoded user-visible strings, missing translation keys, RTL-incompatible CSS, and locale-sensitive formatting without Intl API.
---

# i18n Audit

Scan a codebase for internationalization issues — hardcoded strings, RTL-incompatible CSS, and unsafe date/number formatting.

## Steps

### 1. Find hardcoded user-visible strings

Search UI component files for patterns that suggest untranslated text:

**React / Next.js — JSX text nodes**
```
Grep: >\s*[A-Z][a-z]+ (in .tsx, .jsx files)
Grep: placeholder="[A-Za-z] (missing t() wrapper)
Grep: aria-label="[A-Za-z] (missing t() wrapper)
Grep: title="[A-Za-z] (missing t() wrapper)
```

**Python / Django — hardcoded strings**
```
Grep: messages.error\(request, "[A-Za-z] (not wrapped in _())
Grep: raise ValidationError\("[A-Za-z] (not wrapped in _())
```

Exclude: code strings, log messages, test files, variable names.

Flag: `[HIGH]` user-visible strings not wrapped in translation function.

### 2. Compare translation keys across locales

Detect missing keys in non-primary locales:

```bash
# Find all translation files
find . -name "*.json" -path "*/locales/*" | head -20
find . -name "*.po" -path "*/locale/*" | head -20
find . -name "*.yml" -path "*/locales/*" | head -20
```

Read each translation file, extract keys, and compare. Report keys present in the primary locale but missing in other locales.

Flag: `[HIGH]` key exists in primary locale but missing in ≥1 supported locale.

### 3. RTL-incompatible CSS

Search for directional CSS properties that break in RTL languages:

```
Grep patterns (in .css, .scss, .module.css, .tsx style props):
  margin-left:
  margin-right:
  padding-left:
  padding-right:
  border-left:
  border-right:
  text-align: left
  text-align: right
  float: left
  float: right
  left: (in position:absolute context)
```

Exclude: `border-left` used as accent/decoration (visual only, not structural); `text-align: left` inside `dir="ltr"` override blocks.

Flag: `[MEDIUM]` directional CSS — suggest logical property equivalent.

### 4. Locale-unsafe date/number formatting

```
Grep for:
  new Date().toLocaleDateString()          (no locale param)
  new Date().toLocaleTimeString()          (no locale param)
  new Date().toLocaleString()              (no locale param)
  .toLocaleString()                        (any call without locale)
  toString()  on Number/Date              (not locale-aware)
  .toFixed(                               (not locale-aware for display)
```

Flag: `[MEDIUM]` `toLocaleDateString()` without explicit locale; suggest `Intl.DateTimeFormat`.

### 5. Missing plural handling

```
Grep for:
  count === 1 ? "item" : "items"          (manual pluralization)
  `${count} item`                         (no plural consideration)
  + " items"                              (string concatenation for plural)
```

Flag: `[HIGH]` manual pluralization instead of `t('key', { count })` or `ngettext`.

## Output Format

```
[SEVERITY] Issue description
File: path/to/file.tsx:42
Issue: Hardcoded string "Submit payment" not wrapped in translation function.
Fix: Replace with t('checkout:payment.submit')
```

End with a summary of total findings by category and severity.

## Reference Skills

- `i18n-patterns` — locale detection, key design, RTL CSS logical properties, Intl API
- `i18n-frameworks` — framework-specific translation function wrappers

## After This

- `/tdd` — add i18n tests for flagged missing translations
- `/code-review` — review i18n fixes
