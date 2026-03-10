---
name: storybook-patterns
description: "Storybook patterns: CSF3 (meta satisfies Meta, play functions, @storybook/test), addon ecosystem (a11y, interactions, docs), MSW integration for API mocking, Chromatic CI, storybook-test-runner for Jest/Playwright execution, and Storybook as living documentation."
---

# Storybook Patterns

Component development environment and living documentation system.

## When to Activate

- Writing stories for a new component (CSF3 format)
- Setting up interaction tests with `play` functions
- Configuring MSW for API mocking in stories
- Setting up Chromatic for visual regression
- Auditing existing Storybook setup
- Building automated accessibility checks into stories
- Migrating legacy CSF2 stories to CSF3 with `satisfies Meta` for full type safety
- Running stories as automated tests in CI using `@storybook/test-runner` and axe-playwright

---

## Component Story Format 3 (CSF3)

The current standard — no default exports, `satisfies` for type safety.

### Basic Story

```typescript
// components/Button/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      description: 'Visual variant of the button',
    },
    onClick: { action: 'clicked' },
  },
  tags: ['autodocs'],  // Generates automatic Docs page
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each named export is a story
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
};
```

### Play Functions (Interaction Tests)

```typescript
import { within, userEvent, expect } from '@storybook/test';
import type { Meta, StoryObj } from '@storybook/react';
import { LoginForm } from './LoginForm';

const meta = {
  component: LoginForm,
  tags: ['autodocs'],
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SuccessfulLogin: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Fill in credentials', async () => {
      await userEvent.type(
        canvas.getByLabelText('Email'),
        'user@example.com',
        { delay: 50 }
      );
      await userEvent.type(
        canvas.getByLabelText('Password'),
        'password123',
        { delay: 50 }
      );
    });

    await step('Submit the form', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    });

    await step('Verify success state', async () => {
      await expect(
        canvas.getByText('Welcome back!')
      ).toBeInTheDocument();
    });
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Submit empty form
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));

    // Should show validation errors
    await expect(canvas.getByText('Email is required')).toBeVisible();
    await expect(canvas.getByText('Password is required')).toBeVisible();
  },
};
```

---

## Addons

### `@storybook/addon-a11y` — Accessibility

```bash
npm install --save-dev @storybook/addon-a11y
```

```typescript
// .storybook/main.ts
const config = {
  addons: [
    '@storybook/addon-a11y',
    // ...
  ],
};
```

```typescript
// Disable a11y check for specific story (with reason)
export const DecorativeIcon: Story = {
  parameters: {
    a11y: {
      // Icon is decorative — not exposed to screen readers
      disable: true,
    },
    // Or configure rules:
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};
```

### `@storybook/addon-interactions` — Visual Interaction Tests

```bash
npm install --save-dev @storybook/addon-interactions @storybook/test
```

Interaction tests run in the Storybook UI with step-by-step playback:
- "Step 1: Fill email" → show state
- "Step 2: Submit" → show state
- "Step 3: Verify success" → pass/fail

### `@storybook/test-runner` — Run Stories as Tests

```bash
npm install --save-dev @storybook/test-runner
```

```json
// package.json
{
  "scripts": {
    "test-storybook": "test-storybook"
  }
}
```

```typescript
// .storybook/test-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { checkA11y, injectAxe } from 'axe-playwright';

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page) {
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  },
};

export default config;
```

```bash
# Run all stories as tests
npm run build-storybook -- --quiet
npx http-server storybook-static --port 6006 &
npm run test-storybook
```

---

## MSW Integration (Mock Service Worker)

Mock API calls in stories without changing implementation code.

```bash
npm install msw msw-storybook-addon --save-dev
npx msw init public/ --save  # Install service worker
```

```typescript
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';

initialize();  // Start MSW

export default {
  loaders: [mswLoader],
};
```

```typescript
// ProductPage.stories.ts
import { http, HttpResponse } from 'msw';

export const WithData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', () => {
          return HttpResponse.json([
            { id: 1, name: 'Widget Pro', price: 49.99 },
            { id: 2, name: 'Widget Lite', price: 9.99 },
          ]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', () => HttpResponse.json([])),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', () =>
          HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
        ),
      ],
    },
  },
};
```

---

## Chromatic CI Integration

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for Chromatic baselines

      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }

      - run: npm ci

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true           # Only test affected stories
          exitZeroOnChanges: false    # Fail on unreviewed changes
          autoAcceptChanges: main     # Auto-accept changes on main
```

```bash
# Local: push to Chromatic
npx chromatic --project-token=<token>

# Build only changed stories (faster in CI)
npx chromatic --project-token=<token> --only-changed

# Force rebuild all (e.g., after dependency update)
npx chromatic --project-token=<token> --force-rebuild
```

---

## Storybook as Living Documentation

### autodocs

```typescript
// Enable globally for all components
// .storybook/preview.ts
export const parameters = {
  docs: {
    autodocs: 'tag',  // Only for stories with tags: ['autodocs']
  },
};

// Or per story:
const meta = {
  tags: ['autodocs'],  // Generates Docs page from JSDoc + stories
} satisfies Meta<typeof Component>;
```

### ArgTypes Documentation

```typescript
const meta = {
  component: DatePicker,
  argTypes: {
    value: {
      description: 'Currently selected date',
      control: 'date',
      table: {
        type: { summary: 'Date | null' },
        defaultValue: { summary: 'null' },
      },
    },
    onChange: {
      description: 'Called when user selects a date',
      action: 'date-changed',
      table: { type: { summary: '(date: Date) => void' } },
    },
    locale: {
      description: 'BCP 47 language tag for date formatting',
      control: 'text',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '"en-US"' },
      },
    },
  },
} satisfies Meta<typeof DatePicker>;
```

### Story Descriptions

```typescript
export const WithCustomLocale: Story = {
  name: 'Localized (German)',
  parameters: {
    docs: {
      description: {
        story: 'Date picker configured for German locale — uses DD.MM.YYYY format and German month names.',
      },
    },
  },
  args: {
    locale: 'de-DE',
  },
};
```

---

## .storybook/main.ts Configuration

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],

  addons: [
    '@storybook/addon-essentials',      // Controls, Actions, Docs, Viewport
    '@storybook/addon-a11y',            // Accessibility checks
    '@storybook/addon-interactions',    // Interaction test debugging
    'msw-storybook-addon',             // API mocking
    '@chromatic-com/storybook',         // Chromatic integration
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {
    autodocs: 'tag',
  },

  typescript: {
    check: true,
  },
};

export default config;
```

---

## CSF2 → CSF3 Migration

```typescript
// CSF2 (old — still works but less type-safe)
export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = (args) => <Button {...args} />;
Primary.args = { variant: 'primary', children: 'Click me' };

// CSF3 (new — fully typed, no template function needed)
import type { Meta, StoryObj } from '@storybook/react';

const meta = { component: Button } satisfies Meta<typeof Button>;
export default meta;

export const Primary: StoryObj<typeof meta> = {
  args: { variant: 'primary', children: 'Click me' },
};
```

## Reference

- `visual-testing` — Chromatic setup, Playwright screenshots, baseline management
- `e2e-testing` — Playwright functional tests (not visual)
- `accessibility` — WCAG guidelines the a11y addon checks against
