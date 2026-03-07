---
name: prompt-engineering
description: "System prompt architecture, few-shot design, chain-of-thought, structured output (JSON mode, response_format), tool use patterns, prompt versioning, and regression testing. Use when writing, reviewing, or debugging any LLM prompt — system prompts, user templates, or tool descriptions."
---

# Prompt Engineering Skill

## When to Activate

- Writing or refining system prompts for LLM-powered features
- Reviewing a prompt that returns inconsistent or wrong outputs
- Designing tool/function definitions for tool use
- Implementing structured output (JSON mode, response schemas)
- Setting up prompt versioning or regression tests
- Debugging unexpected model behaviour (hallucination, refusals, format drift)

---

## System Prompt Architecture

A well-structured system prompt has four ordered fields. Reihenfolge matters — the model attends more strongly to content near the beginning.

```
1. PERSONA        Who you are (role, tone, expertise)
2. CONTEXT        What the system is and what data is available
3. CONSTRAINTS    What you must and must not do
4. OUTPUT FORMAT  Exactly how the response should be structured
```

### Example skeleton

```
You are a {role} for {product}. {One sentence of expertise context.}

## Context
{What the system has access to, e.g., database records, user profile}

## Rules
- Always {positive constraint}
- Never {negative constraint}
- If {edge case}: {fallback behaviour}

## Output Format
Respond with valid JSON matching this schema:
{schema}
```

**Why this order?** Persona anchors all later instructions. Context feeds grounding. Constraints prevent drift. Output format at the end is the last thing before the response, so the model is primed for the format.

---

## Few-Shot Design

### When to use few-shot (vs. zero-shot)

| Situation | Recommendation |
|-----------|---------------|
| Simple extraction or classification | Zero-shot — saves tokens |
| Custom output format (e.g., structured JSON) | 2-3 examples |
| Domain-specific tone or style | 3-5 examples |
| Multi-step reasoning | Chain-of-thought examples |
| Complex business rules | 5+ examples with edge cases |

### Example selection criteria

1. **Representative** — examples should cover the typical input distribution
2. **Diverse** — include edge cases (empty input, long input, multilingual)
3. **Correct** — never include examples with wrong outputs, even with corrections
4. **Balanced** — for classification, include all classes roughly equally

### Formatting few-shot examples

```
## Examples

Input: "invoice_date: 2024-01-15"
Output: {"date": "2024-01-15", "field": "invoice_date"}

Input: "due date is January 20th"
Output: {"date": "2024-01-20", "field": "due_date"}

Input: "no date found"
Output: {"date": null, "field": null}
```

Keep examples in the **same message** as instructions, not split across turns (splitting confuses the format).

---

## Chain-of-Thought

### When CoT helps

- Multi-step arithmetic or logic
- Tasks where intermediate reasoning reduces errors
- Classification with nuanced rules
- Anything where "think step by step" measurably improves output

### Variants

```
# Explicit CoT trigger (best for complex reasoning)
"Think step by step before giving your final answer."

# Scratchpad pattern (reasoning stays in output)
"First, reason through the problem in a <thinking> block. Then provide your answer in an <answer> block."

# Zero-shot CoT
"Let's think through this carefully:"

# Structured CoT (for multi-criteria decisions)
"For each criterion, reason: [criterion] → [reasoning] → [verdict]. Finally output your overall decision."
```

### Scratchpad pattern (recommended)

```typescript
const systemPrompt = `
Analyze the support ticket and classify its priority.

Think step by step in a <thinking> block:
1. What is the user's core problem?
2. Is this blocking their work?
3. How many users are affected?

Then output your classification in <result>:
<result>{"priority": "P0|P1|P2|P3", "reason": "one sentence"}</result>
`;
```

**Note:** For Anthropic models, extended thinking (`thinking: { type: "enabled" }`) is preferable to scratchpad prompting for complex reasoning tasks — it uses compute more efficiently.

---

## Structured Output

### JSON mode (`response_format`)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Use tool use to enforce structured output (most reliable with Claude)
const response = await client.messages.create({
  model: 'claude-sonnet-latest',
  max_tokens: 1024,
  tools: [{
    name: 'extract_data',
    description: 'Extract structured data from the input',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name' },
        email: { type: 'string', format: 'email' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['name', 'email', 'priority'],
    },
  }],
  tool_choice: { type: 'tool', name: 'extract_data' },
  messages: [{ role: 'user', content: inputText }],
});

// Extract tool result
const toolUse = response.content.find(b => b.type === 'tool_use');
const extracted = toolUse?.input;
```

### Schema in prompt (fallback when tool use unavailable)

```
Respond ONLY with valid JSON. No explanation, no markdown fences.

Schema:
{
  "name": string,
  "email": string,
  "priority": "low" | "medium" | "high"
}

If a field cannot be determined, use null.
```

### Fallback on parse failure

```typescript
function parseWithFallback<T>(text: string, fallback: T): T {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn('JSON parse failed, using fallback:', text.slice(0, 100));
    return fallback;
  }
}
```

---

## Tool Use Design

### Tool naming conventions

```
# Good — verb + noun, specific
search_knowledge_base
create_calendar_event
get_user_profile

# Bad — vague or abbreviated
search
doThing
getUserInfo
```

### Description quality

A tool description is part of the prompt. Poor descriptions = wrong tool selection.

```typescript
// Bad description — vague
{
  name: 'search',
  description: 'Search for things',
}

// Good description — specific, when-to-use, what-it-returns
{
  name: 'search_knowledge_base',
  description: 'Search the internal knowledge base for answers to user questions. Returns up to 5 relevant articles with title, snippet, and URL. Use for any question about product features, pricing, or policies.',
  input_schema: { ... }
}
```

### When tool vs. prompt

| Approach | Use when |
|----------|----------|
| Tool use | Need structured output, calling external APIs, guaranteed schema |
| Prompt only | Simple extraction, formatting, no external calls needed |
| Both | Complex workflow: tool retrieves data, prompt synthesizes answer |

### Parallel tool calls

Claude can call multiple tools in one turn. Design tools to be composable:

```typescript
// Declare tool_choice: "auto" and provide multiple tools
// Claude will call them in parallel or sequence as appropriate
tool_choice: { type: 'auto' }
```

---

## Prompt Versioning

### File conventions

```
prompts/
├── v1/
│   ├── system.md          # System prompt
│   ├── user-template.md   # User message template with {variables}
│   └── CHANGELOG.md       # What changed and why
├── v2/
│   ├── system.md
│   └── CHANGELOG.md
└── current -> v2/         # Symlink to active version
```

### Changelog format

```markdown
# Prompt Changelog

## v2 — 2024-03-01
**Changed:** Added explicit JSON schema to output format section.
**Why:** v1 produced markdown-fenced JSON in ~15% of runs; v2 drops that to 0%.
**Eval delta:** Pass rate: 84% → 97% on golden set (n=200).

## v1 — 2024-02-15
Initial prompt.
```

### Git history as audit trail

- Commit each prompt change separately with a descriptive message
- Reference the eval result in the commit body
- Tag prompt releases: `git tag prompt-v2`

---

## Regression Testing

### LLM-as-judge setup

```typescript
// Judge prompt — use a separate, powerful model
async function judgeOutput(
  input: string,
  expectedCriteria: string[],
  actualOutput: string,
): Promise<{ passed: boolean; score: number; reason: string }> {
  const judgePrompt = `
You are an evaluator. Score the following output 0-10 on these criteria:
${expectedCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Input: ${input}
Output: ${actualOutput}

Respond with JSON: {"score": number, "reason": "one sentence", "passed": boolean}
(passed = score >= 7)
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-latest',
    max_tokens: 200,
    messages: [{ role: 'user', content: judgePrompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

### Golden set fixtures

```typescript
// tests/prompts/golden-set.ts
export const goldenSet = [
  {
    id: 'basic-extraction',
    input: 'invoice from Acme Corp dated Jan 15, 2024 for $1,200',
    expectedCriteria: [
      'Vendor is "Acme Corp"',
      'Date is "2024-01-15"',
      'Amount is 1200',
      'Output is valid JSON',
    ],
  },
  {
    id: 'missing-date',
    input: 'invoice from Acme Corp, no date',
    expectedCriteria: [
      'Vendor is "Acme Corp"',
      'Date field is null',
      'Output is valid JSON',
    ],
  },
];
```

### CI gate

```typescript
// Pass threshold: 90% of golden set must score >= 7
const PASS_THRESHOLD = 0.9;

const results = await Promise.all(goldenSet.map(async (fixture) => {
  const output = await callPrompt(fixture.input);
  return judgeOutput(fixture.input, fixture.expectedCriteria, output);
}));

const passRate = results.filter(r => r.passed).length / results.length;

if (passRate < PASS_THRESHOLD) {
  console.error(`Prompt regression: pass rate ${passRate} < ${PASS_THRESHOLD}`);
  process.exit(1);
}
```

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `"You are a helpful AI assistant."` | Vague persona — model invents behaviour | Specify role, domain, and tone explicitly |
| Contradictory instructions | `"Be concise"` + `"Explain everything in detail"` | Pick one, or define when each applies |
| Unbounded output | No `max_tokens`, no length constraint in prompt | Set `max_tokens`, add `"Respond in 2-3 sentences"` |
| Injecting untrusted user input into system prompt | Prompt injection risk | Separate user input as a user-turn message, never splice into system prompt |
| Sensitive data in prompts | PII or secrets in prompts logged by provider | Redact or hash before sending; check provider data policies |
| `"Try to follow these rules"` | Weak instruction — model may not comply | Use `"Always"`, `"Never"`, `"You must"` |
| Repeating instructions | Same instruction 3× in different words | State once, clearly |

---

## Checklist

- [ ] System prompt has all four sections: Persona, Context, Constraints, Output Format
- [ ] No contradictory instructions
- [ ] User-controlled input is in user-turn messages, not system prompt
- [ ] Structured output uses tool use or explicit schema
- [ ] Fallback handling for malformed JSON
- [ ] `max_tokens` set on every API call
- [ ] Prompt versioned in `prompts/vN/` with CHANGELOG
- [ ] Golden set with ≥20 fixtures covers happy path + edge cases
- [ ] CI gate enforces ≥90% pass rate on golden set
