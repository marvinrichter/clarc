---
description: Design an SDK architecture for an API. Delegates to the sdk-architect agent to recommend a generation strategy, error hierarchy, authentication patterns, backward compatibility policy, CI release process, and documentation site.
---

# SDK Design

Design an SDK architecture for an API.

## Instructions

### 1. Parse the Target

Parse `$ARGUMENTS` as the API or service to build an SDK for.

If `$ARGUMENTS` is empty, ask: "What API or service would you like to design an SDK for? (e.g., 'REST API at api/v1/openapi.yaml', 'our payments service', 'GitHub-like git hosting API')"

### 2. Gather Context

Before delegating, read any available API specs:
- Check for `api/v1/openapi.yaml`, `openapi.yaml`, `api-spec.yaml` or similar
- Check for existing SDK directories (`sdk/`, `client/`, `packages/`)
- Note the target languages from `$ARGUMENTS` or ask if not specified

### 3. Delegate to sdk-architect

Use the **sdk-architect** agent.

Pass:
- The API description or path to the OpenAPI spec
- Target language(s) for the SDK
- Any existing SDK directories or code found
- Business context (internal tooling vs. public developer SDK)

The agent will produce:
- **Generation strategy** — openapi-generator vs. Speakeasy vs. manual
- **Error hierarchy** — typed error classes and retry policy
- **Authentication patterns** — API key, OAuth2, token refresh
- **Backward compatibility policy** — semver rules, deprecation protocol
- **CI release process** — automated publish pipeline
- **Documentation site recommendation** — platform and structure

### 4. Save the Design

Save the agent's output to `docs/architecture/<name>-sdk-architecture.md`.

Create the directory if it doesn't exist.

### 5. Summarize

After saving, output:

```
SDK architecture saved: docs/architecture/<name>-sdk-architecture.md

Generation strategy: <strategy>
Target language(s): <languages>

<1-2 sentence rationale for key decisions>

Next: implement the SDK using the recommended strategy, then run /setup-ci for the release pipeline.
```

## Arguments

`$ARGUMENTS` is the API or target description. Examples:
- `payments REST API — TypeScript and Python SDKs`
- `api/v1/openapi.yaml for Go`
- `internal analytics service — Java SDK`

## See Also

- Skill `api-design` — REST API design patterns and contract-first approach (use before designing the SDK)
- `/setup-ci` — set up CI/CD for the SDK release pipeline

## After This

- `/plan` — create SDK implementation plan
- `/tdd` — write SDK tests first
- `/sdk-review` — review the implemented SDK
