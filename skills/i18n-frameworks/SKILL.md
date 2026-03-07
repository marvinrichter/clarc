---
name: i18n-frameworks
description: "Framework-specific i18n implementation: i18next + react-i18next (React/Next.js), next-intl (Next.js App Router), Django's i18n (gettext/makemessages), Rails I18n (YAML-based), Localizable.strings + SwiftUI (iOS), Android string resources, and Flutter's ARB format. Concrete setup and usage patterns for each."
---

# i18n Frameworks Skill

## When to Activate

- Setting up i18n in a React, Next.js, Django, Rails, iOS, Android, or Flutter app
- Migrating from a custom solution to a framework-standard approach
- Adding a new locale to an existing i18n setup
- Debugging missing translations or locale switching issues

---

## i18next + react-i18next (React / Vite)

### Setup

```bash
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector
```

```typescript
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    ns: ['common', 'auth', 'dashboard'],   // namespaces = separate JSON files
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: { order: ['querystring', 'localStorage', 'navigator'] },
    interpolation: { escapeValue: false },  // React already escapes
  });

export default i18n;
```

```
public/locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   └── dashboard.json
└── de/
    ├── common.json
    ├── auth.json
    └── dashboard.json
```

### Usage

```tsx
import { useTranslation } from 'react-i18next';

function LoginButton() {
  const { t, i18n } = useTranslation('auth');

  return (
    <div>
      <button>{t('login.submit')}</button>

      {/* Switch locale */}
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    </div>
  );
}
```

### Translation file structure

```json
// public/locales/en/auth.json
{
  "login": {
    "title": "Sign in",
    "submit": "Sign in",
    "error": {
      "invalid_credentials": "Invalid email or password",
      "account_locked": "Account locked. Try again in {{minutes}} minutes."
    }
  }
}
```

---

## next-intl (Next.js App Router)

### Setup

```bash
npm install next-intl
```

```typescript
// middleware.ts — locale routing
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
});

export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] };
```

```
app/
└── [locale]/
    ├── layout.tsx
    └── page.tsx

messages/
├── en.json
└── de.json
```

### Usage (Server Components)

```tsx
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return <h1>{t('title')}</h1>;
}
```

### Usage (Client Components)

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function LoginButton() {
  const t = useTranslations('Auth');
  return <button>{t('submit')}</button>;
}
```

### Messages file

```json
// messages/en.json
{
  "HomePage": {
    "title": "Welcome"
  },
  "Auth": {
    "submit": "Sign in",
    "items": "{count, plural, one {# item} other {# items}}"
  }
}
```

---

## Django (Python)

### Setup

```python
# settings.py
LANGUAGE_CODE = 'en'
USE_I18N = True
USE_L10N = True   # locale-aware formatting
USE_TZ = True

LANGUAGES = [
    ('en', 'English'),
    ('de', 'Deutsch'),
    ('ar', 'العربية'),
]

LOCALE_PATHS = [BASE_DIR / 'locale']

MIDDLEWARE = [
    # ...
    'django.middleware.locale.LocaleMiddleware',  # after SessionMiddleware, before CommonMiddleware
    # ...
]
```

```
locale/
├── de/
│   └── LC_MESSAGES/
│       ├── django.po   # source
│       └── django.mo   # compiled
└── ar/
    └── LC_MESSAGES/
        ├── django.po
        └── django.mo
```

### Extracting and compiling

```bash
# Extract all strings marked with gettext
python manage.py makemessages -l de
python manage.py makemessages -l ar

# Compile after translating .po files
python manage.py compilemessages
```

### Usage in code

```python
from django.utils.translation import gettext_lazy as _
from django.utils.translation import ngettext

# In models, forms — use gettext_lazy (evaluated at render time)
class UserProfile(models.Model):
    class Meta:
        verbose_name = _('user profile')
        verbose_name_plural = _('user profiles')

# In views — use gettext (evaluated immediately)
from django.utils.translation import gettext as _

def my_view(request):
    message = _('Hello, %(name)s!') % {'name': request.user.first_name}

# Pluralization
def items_message(count):
    return ngettext(
        '%(count)d item',
        '%(count)d items',
        count,
    ) % {'count': count}
```

### Templates

```html
{% load i18n %}

<h1>{% trans "Welcome" %}</h1>

<!-- With variable -->
{% blocktrans with name=user.first_name %}
  Hello, {{ name }}!
{% endblocktrans %}

<!-- Plural -->
{% blocktrans count count=items|length %}
  {{ count }} item
{% plural %}
  {{ count }} items
{% endblocktrans %}
```

---

## Rails (Ruby)

### Setup

```ruby
# config/application.rb
config.i18n.available_locales = [:en, :de, :fr]
config.i18n.default_locale = :en
config.i18n.fallbacks = [I18n.default_locale]
```

```yaml
# config/locales/en.yml
en:
  auth:
    login:
      title: "Sign in"
      submit: "Sign in"
      error:
        invalid: "Invalid email or password"

  items:
    one: "%{count} item"
    other: "%{count} items"
```

### Usage

```ruby
# In controllers / models
I18n.t('auth.login.title')
I18n.t('items', count: @items.length)

# Locale detection in ApplicationController
class ApplicationController < ActionController::Base
  before_action :set_locale

  def set_locale
    I18n.locale = extract_locale || I18n.default_locale
  end

  private

  def extract_locale
    parsed_locale = params[:locale]
    I18n.available_locales.map(&:to_s).include?(parsed_locale) ? parsed_locale : nil
  end
end
```

```erb
<!-- Views -->
<h1><%= t('auth.login.title') %></h1>
<p><%= t('items', count: @items.length) %></p>
```

---

## SwiftUI (iOS)

### Localizable.strings (legacy — Xcode < 15)

```
// en.lproj/Localizable.strings
"login.submit" = "Sign in";
"login.error.invalid" = "Invalid email or password";
"items.count" = "%d items";
```

```swift
// Usage
Text(String(localized: "login.submit"))

// With arguments
Text(String(localized: "items.count \(count)"))
```

### String Catalogs (.xcstrings — Xcode 15+, recommended)

Xcode 15 introduces `.xcstrings` — a single JSON file managing all locales:

```json
// Localizable.xcstrings (managed by Xcode UI, but here's the format)
{
  "sourceLanguage": "en",
  "strings": {
    "login.submit": {
      "localizations": {
        "en": { "stringUnit": { "state": "translated", "value": "Sign in" } },
        "de": { "stringUnit": { "state": "translated", "value": "Anmelden" } }
      }
    }
  }
}
```

### Pluralization in Swift

```swift
// en.stringsdict (for plurals with Localizable.strings)
// Or use String(localized:) with pluralization rules in .xcstrings

let items = String(localized: "\(count) items", table: "Localizable")
```

---

## Android (Kotlin)

### Resource files

```xml
<!-- res/values/strings.xml (default / English) -->
<resources>
    <string name="login_submit">Sign in</string>
    <string name="login_error_invalid">Invalid email or password</string>
    <plurals name="items_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>

<!-- res/values-de/strings.xml (German) -->
<resources>
    <string name="login_submit">Anmelden</string>
    <string name="login_error_invalid">Ungültige E-Mail oder Passwort</string>
    <plurals name="items_count">
        <item quantity="one">%d Element</item>
        <item quantity="other">%d Elemente</item>
    </plurals>
</resources>
```

```kotlin
// Kotlin usage
getString(R.string.login_submit)
resources.getQuantityString(R.plurals.items_count, count, count)
```

```xml
<!-- XML layout -->
<Button android:text="@string/login_submit" />
```

---

## Checklist

| Framework | Key task |
|---|---|
| React + i18next | Namespaces split by feature; Backend plugin for lazy loading |
| Next.js App Router | next-intl middleware; `getTranslations` in Server Components |
| Django | `LocaleMiddleware` in middleware; `makemessages` + `compilemessages` |
| Rails | `before_action :set_locale` with `I18n.available_locales` check |
| SwiftUI | `.xcstrings` catalog (Xcode 15+); `String(localized:)` syntax |
| Android | `values-<locale>/strings.xml`; `<plurals>` for plural forms |

- [ ] Default locale defined
- [ ] Fallback locale configured
- [ ] All user-visible strings extracted (no hardcoded text)
- [ ] Plural forms use framework-native API (not string concatenation)
- [ ] Missing translation keys logged
- [ ] CI checks that all locales have the same keys (no missing translations)
