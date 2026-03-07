---
name: i18n-patterns
description: "Internationalization architecture: locale detection strategy, translation key organization (flat vs. namespaced), pluralization rules (CLDR), gender agreement, RTL layout (CSS logical properties), date/time/number/currency formatting (Intl API), and locale-aware sorting. Language-agnostic patterns applicable to any framework."
---

# i18n Patterns Skill

## When to Activate

- Adding internationalization to an existing application
- Designing translation file structure from scratch
- Supporting RTL languages (Arabic, Hebrew, Persian)
- Fixing locale-sensitive formatting (dates, numbers, currency)
- Auditing for hardcoded user-visible strings

---

## Locale Detection

Apply locale sources in this priority order (highest wins):

```
1. User preference (stored in DB or localStorage)
2. URL parameter     (?lang=de, /de/about)
3. Subdomain         (de.example.com)
4. Accept-Language header (server-side)
5. Browser           (navigator.language)
6. Default           (en)
```

### Implementation

```typescript
function detectLocale(req?: Request): string {
  // 1. User preference (e.g., from JWT or cookie)
  const userPref = getUserPreferenceLocale(); // from auth session
  if (userPref) return userPref;

  // 2. URL param
  const urlParam = new URLSearchParams(window.location.search).get('lang');
  if (urlParam && SUPPORTED_LOCALES.includes(urlParam)) return urlParam;

  // 3. Browser
  const browserLang = navigator.language.split('-')[0]; // 'en-US' → 'en'
  if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

  // 4. Default
  return 'en';
}

const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'ar', 'zh'];
```

---

## Translation Key Design

### Flat vs. namespaced

```
# Flat (simple apps, <200 keys)
"submit_button" = "Submit"
"error_required" = "This field is required"

# Namespaced (recommended for larger apps)
"checkout:payment.submit" = "Pay now"
"checkout:payment.error.card_declined" = "Your card was declined"
"auth:login.error.invalid_credentials" = "Invalid email or password"
```

### Key naming conventions

```
# Format: namespace:context.element[.state]
"dashboard:sidebar.nav.overview" = "Overview"
"dashboard:sidebar.nav.settings" = "Settings"
"forms:validation.required"      = "Required"
"forms:validation.min_length"    = "Minimum {min} characters"

# CORRECT — descriptive key, not the string itself
"auth:submit_button" = "Sign in"

# WRONG — using the English string as the key (breaks on reuse and German has cases)
"Sign in" = "Anmelden"
```

### Key conventions checklist

- Keys are `snake_case` or `camelCase` — be consistent
- Keys describe the element, not the content
- Keys include context (namespace + location)
- No full sentences as keys
- Keys survive renaming of the English string

---

## Pluralization

### CLDR plural categories

Different languages use different plural forms. Never assume two forms (singular/plural).

| Language | Categories | Example |
|----------|-----------|---------|
| English | one, other | 1 item / 2 items |
| German | one, other | 1 Element / 2 Elemente |
| Russian | one, few, many, other | 1 файл / 2 файла / 5 файлов / 1.5 файла |
| Arabic | zero, one, two, few, many, other | 0 ملفات / 1 ملف / 2 ملفان / 5 ملفات |
| Japanese | other | (no plural forms) |

### ICU MessageFormat syntax (recommended)

Most modern i18n libraries support ICU MessageFormat:

```
# English
"items_selected": "{count, plural, one {# item selected} other {# items selected}}"

# German
"items_selected": "{count, plural, one {# Element ausgewählt} other {# Elemente ausgewählt}}"

# Russian
"items_selected": "{count, plural, one {# файл выбран} few {# файла выбрано} many {# файлов выбрано} other {# файла выбрано}}"
```

### Usage in code

```typescript
// i18next with ICU
t('items_selected', { count: selectedItems.length })

// Intl.PluralRules (vanilla JS)
const pr = new Intl.PluralRules('ru');
const rule = pr.select(count); // 'one' | 'few' | 'many' | 'other'
const message = ruTranslations[`items_${rule}`];
```

---

## RTL Support

### CSS Logical Properties

Replace directional properties with logical equivalents that auto-flip in RTL:

```css
/* WRONG — directional, breaks in RTL */
.card {
  margin-left: 16px;
  padding-right: 12px;
  border-left: 2px solid blue;
  text-align: left;
}

/* CORRECT — logical, works in both LTR and RTL */
.card {
  margin-inline-start: 16px;  /* left in LTR, right in RTL */
  padding-inline-end: 12px;   /* right in LTR, left in RTL */
  border-inline-start: 2px solid blue;
  text-align: start;           /* left in LTR, right in RTL */
}
```

### Full logical property mapping

| Directional | Logical equivalent |
|-------------|-------------------|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `left` / `right` (position) | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` | `text-align: start` |
| `float: left` | `float: inline-start` |

### HTML dir attribute

```html
<!-- Set on root element — CSS logical properties respond automatically -->
<html lang="ar" dir="rtl">

<!-- Or per-element for mixed content -->
<p dir="rtl">نص عربي</p>
```

### Icon mirroring in RTL

Some icons need to be mirrored (arrows, chevrons, navigation icons — not symmetric icons):

```css
[dir="rtl"] .icon-arrow-right,
[dir="rtl"] .icon-chevron-right,
[dir="rtl"] .icon-back {
  transform: scaleX(-1);
}

/* Do NOT mirror: close, settings, search, user icons */
```

---

## Intl API

### Date formatting

```typescript
// Always pass locale and options — never rely on default locale
const formatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'long',    // '15. März 2024'
  timeStyle: 'short',   // '14:30'
});
console.log(formatter.format(new Date()));

// Relative time
const relFormatter = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
console.log(relFormatter.format(-1, 'day'));  // 'gestern'
console.log(relFormatter.format(-3, 'day'));  // 'vor 3 Tagen'
```

### Number and currency

```typescript
// Number with locale-aware thousands separator and decimal
new Intl.NumberFormat('de-DE').format(1234567.89);  // '1.234.567,89'
new Intl.NumberFormat('en-US').format(1234567.89);  // '1,234,567.89'

// Currency
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5);
// '1.234,50 €'

new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.5);
// '$1,234.50'
```

### Locale-aware sorting

```typescript
// WRONG — default sort is bytewise, incorrect for non-ASCII
const sorted = names.sort();

// CORRECT — locale-aware collation
const collator = new Intl.Collator('de', { sensitivity: 'base' });
const sorted = names.sort((a, b) => collator.compare(a, b));
// Correctly sorts: Ärger, Apfel, Über → Apfel, Ärger, Über
```

---

## Missing Translation Handling

### Fallback locale chain

```typescript
// i18next fallback configuration
i18n.init({
  fallbackLng: ['en'],         // fall back to English
  // Or a chain: de-AT → de → en
  fallbackLng: {
    'de-AT': ['de', 'en'],
    'de-CH': ['de', 'en'],
    default: ['en'],
  },
});
```

### Pseudo-localization for testing

Replace characters to verify layout handles expansion (German is ~30% longer than English):

```typescript
function pseudoLocalize(str: string): string {
  return str
    .replace(/a/g, 'à').replace(/e/g, 'é').replace(/i/g, 'î')
    .replace(/o/g, 'ô').replace(/u/g, 'û').replace(/c/g, 'ç')
    + ' !!!'; // force string expansion
}
// "Submit" → "Ŝûbmît !!!"
```

Enable in dev:

```typescript
if (process.env.NODE_ENV === 'development' && process.env.PSEUDO_LOCALE) {
  i18n.addResourceBundle('pseudo', 'translation', pseudoLocalize);
  i18n.changeLanguage('pseudo');
}
```

### Missing translation logging

```typescript
i18n.init({
  missingKeyHandler: (lngs, ns, key) => {
    console.warn(`[i18n] Missing key: ${ns}:${key} for ${lngs.join(', ')}`);
    // In production: report to Sentry or similar
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(`Missing i18n key: ${ns}:${key}`);
    }
  },
});
```

---

## Checklist

- [ ] Locale detected from: user preference > URL > browser > default
- [ ] Supported locales list defined and validated at detection
- [ ] Translation keys are namespaced and describe element, not content
- [ ] No sentences used as keys
- [ ] Pluralization uses ICU MessageFormat (supports all CLDR categories)
- [ ] CSS uses logical properties (`margin-inline-start` not `margin-left`)
- [ ] `dir="rtl"` set on `<html>` for RTL locales
- [ ] Directional icons mirrored in RTL; symmetric icons not mirrored
- [ ] All dates formatted with `Intl.DateTimeFormat` (locale + options always explicit)
- [ ] All numbers formatted with `Intl.NumberFormat`
- [ ] Sorting uses `Intl.Collator`
- [ ] Fallback locale chain configured
- [ ] Pseudo-locale available for layout testing in dev
- [ ] Missing keys logged (warn in dev, Sentry in production)
