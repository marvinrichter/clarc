#!/usr/bin/env node
/**
 * add-after-this.js
 * Adds ## After This sections to command files that are missing them.
 * Reads AT-* entries from the roadmap and applies them.
 */

const fs = require('fs')
const path = require('path')

const COMMANDS_DIR = path.join(__dirname, '..', 'commands')

// Map of filename → After This content (from roadmap AT-* entries)
const AFTER_THIS_MAP = {
  // AT-R: language *-review commands
  'bash-review.md': `## After This\n\n- \`/tdd\` — add tests for scripts that failed review\n- \`/build-fix\` — fix shell errors flagged by shellcheck\n- \`/security-review\` — full DevSecOps scan if security issues found`,
  'go-review.md': `## After This\n\n- \`/tdd\` — add tests for Go code that failed review\n- \`/go-build\` — fix compilation errors flagged during review\n- \`/security-review\` — full scan if security issues found`,
  'java-review.md': `## After This\n\n- \`/tdd\` — add tests for Java code that failed review\n- \`/build-fix\` — fix compilation or dependency errors\n- \`/security-review\` — full scan if security or injection issues found`,
  'python-review.md': `## After This\n\n- \`/tdd\` — add tests for Python code that failed review\n- \`/python-test\` — run Python tests with coverage\n- \`/security-review\` — full scan if security issues found`,
  'r-review.md': `## After This\n\n- \`/tdd\` — add tests for R code that failed review\n- \`/build-fix\` — fix dependency or package issues`,
  'kotlin-review.md': `## After This\n\n- \`/tdd\` — add tests for Kotlin code that failed review\n- \`/build-fix\` — fix compilation errors\n- \`/android-review\` — if this is an Android/Compose project`,
  'csharp-review.md': `## After This\n\n- \`/tdd\` — add tests for C# code that failed review\n- \`/build-fix\` — fix compilation or NuGet errors\n- \`/security-review\` — full scan if security issues found`,
  'cpp-review.md': `## After This\n\n- \`/tdd\` — add tests for C++ code that failed review\n- \`/cpp-build\` — fix build errors flagged during review\n- \`/security-review\` — full scan if memory safety issues found`,
  'scala-review.md': `## After This\n\n- \`/tdd\` — add tests for Scala code that failed review\n- \`/build-fix\` — fix compilation errors`,
  'php-review.md': `## After This\n\n- \`/tdd\` — add tests for PHP code that failed review\n- \`/security-review\` — full scan if injection or XSS issues found`,
  'ruby-review.md': `## After This\n\n- \`/tdd\` — add tests for Ruby code that failed review\n- \`/security-review\` — full scan if Brakeman findings are present`,
  'elixir-review.md': `## After This\n\n- \`/tdd\` — add tests for Elixir code that failed review\n- \`/build-fix\` — fix compilation or dependency issues`,
  'flutter-review.md': `## After This\n\n- \`/tdd\` — add widget tests for Flutter code that failed review\n- \`/mobile-release\` — run release checks after fixes are applied`,
  'swift-review.md': `## After This\n\n- \`/tdd\` — add tests for Swift code that failed review\n- \`/swift-build\` — fix compilation errors\n- \`/mobile-release\` — run release checks after fixes are applied`,
  'frontend-arch-review.md': `## After This\n\n- \`/arch-design\` — design improved architecture based on review findings\n- \`/tdd\` — add tests for identified gaps\n- \`/code-review\` — review implementation after architectural changes`,

  // AT-A: *-audit commands
  'a11y-audit.md': `## After This\n\n- \`/tdd\` — add accessibility unit tests for flagged violations\n- \`/code-review\` — review accessibility fixes before committing`,
  'command-audit.md': `## After This\n\n- \`/system-review components\` — full component review after command fixes\n- \`/prompt-audit\` — review prompt quality of fixed commands`,
  'dark-mode-audit.md': `## After This\n\n- \`/code-review\` — review dark mode token fixes\n- \`/design-system-review\` — full design system audit if token gaps are widespread`,
  'dep-audit.md': `## After This\n\n- \`/dep-update\` — interactive upgrade workflow (run this command first to scope what to upgrade)\n- \`/sbom\` — generate SBOM for release attestation\n- \`/security-review\` — full DevSecOps pipeline scan if CRITICAL vulnerabilities found`,
  'eda-review.md': `## After This\n\n- \`/code-review\` — review event handler implementation\n- \`/tdd\` — add idempotency and DLQ tests for flagged handlers`,
  'gitops-review.md': `## After This\n\n- \`/iac-review\` — review Terraform/Kubernetes manifests\n- \`/security-review\` — full DevSecOps scan\n- \`/zero-trust-review\` — if NetworkPolicy or PeerAuthentication gaps found`,
  'hook-audit.md': `## After This\n\n- \`/system-review components\` — full component review after hook fixes`,
  'i18n-audit.md': `## After This\n\n- \`/tdd\` — add i18n tests for flagged missing translations\n- \`/code-review\` — review i18n fixes`,
  'iac-review.md': `## After This\n\n- \`/gitops-review\` — validate GitOps workflow after IaC changes\n- \`/tdd\` — add Terratest or policy tests\n- \`/security-review\` — full scan if misconfiguration found`,
  'resilience-audit.md': `## After This\n\n- \`/tdd\` — add chaos and failure scenario tests\n- \`/chaos-experiment\` — run structured chaos experiments for flagged failure modes`,
  'storybook-audit.md': `## After This\n\n- \`/design-system-review\` — full design system audit (tokens, dark mode, icons, a11y)\n- \`/code-review\` — review component implementation after story coverage gaps are fixed`,
  'web-perf.md': `## After This\n\n- \`/tdd\` — add performance regression tests for critical metrics\n- \`/code-review\` — review performance optimisation changes`,

  // AT-B: *-build commands
  'build-fix.md': `## After This\n\n- \`/tdd\` — add tests to prevent regression after the build is fixed\n- \`/verify\` — confirm full build + type-check + tests pass`,
  'cpp-build.md': `## After This\n\n- \`/cpp-review\` — review code quality after the build is green\n- \`/tdd\` — add tests to prevent regression`,
  'go-build.md': `## After This\n\n- \`/go-review\` — review code quality after the build is green\n- \`/tdd\` — add tests to prevent regression`,
  'rust-build.md': `## After This\n\n- \`/rust-review\` — review code quality after the build is green\n- \`/tdd\` — add tests to prevent regression`,
  'typescript-build.md': `## After This\n\n- \`/typescript-review\` — review code quality after type errors are fixed\n- \`/tdd\` — add tests to prevent regression`,
  'wasm-build.md': `## After This\n\n- \`/wasm-review\` — review WebAssembly code quality after the build is green\n- \`/security-review\` — check unsafe blocks flagged during build`,

  // AT-T: test commands
  'go-test.md': `## After This\n\n- \`/go-review\` — review code quality after tests are green\n- \`/verify\` — run full build + type-check + tests before committing`,
  'python-test.md': `## After This\n\n- \`/python-review\` — review code quality after tests are green\n- \`/verify\` — run full build + tests before committing`,
  'rust-test.md': `## After This\n\n- \`/rust-review\` — review code quality after tests are green\n- \`/verify\` — run full build + tests before committing`,
  'test-coverage.md': `## After This\n\n- \`/tdd\` — write tests for uncovered code paths\n- \`/code-review\` — review added tests for quality`,

  // AT-D: design and architecture commands
  'agent-design.md': `## After This\n\n- \`/tdd\` — add tests for the designed agent's behavior\n- \`/orchestrate\` — orchestrate the agent in a multi-agent workflow`,
  'arc42.md': `## After This\n\n- \`/plan\` — create implementation plan based on the architecture document\n- \`/arch-design\` — design specific subsystems if needed`,
  'data-mesh-review.md': `## After This\n\n- \`/arch-design\` — design the data mesh architecture\n- \`/tdd\` — add data contract tests`,
  'idp-design.md': `## After This\n\n- \`/plan\` — create implementation plan for the IDP\n- \`/golden-path\` — implement Golden Path templates based on the design`,
  'orchestrator-design.md': `## After This\n\n- \`/orchestrate\` — implement the designed orchestration workflow\n- \`/tdd\` — add orchestration tests`,
  'sdk-design.md': `## After This\n\n- \`/plan\` — create SDK implementation plan\n- \`/tdd\` — write SDK tests first\n- \`/sdk-review\` — review the implemented SDK`,
  'sdk-review.md': `## After This\n\n- \`/tdd\` — add tests for SDK gaps flagged in review\n- \`/code-review\` — review SDK fixes`,
  'wireframe.md': `## After This\n\n- \`/design-critique\` — get structured feedback on the wireframe\n- \`/slide-deck\` — present wireframe in a stakeholder slide deck`,
  'chart-review.md': `## After This\n\n- \`/code-review\` — review chart implementation code\n- \`/tdd\` — add tests for chart data transformations`,

  // AT-W: workflow commands
  'breakdown.md': `## After This\n\n- \`/tdd\` — implement the broken-down tasks with TDD\n- \`/plan\` — create a full implementation plan from the breakdown`,
  'experiment.md': `## After This\n\n- \`/tdd\` — add tests for experiment tracking code\n- \`/instrument\` — add analytics instrumentation for experiment metrics`,
  'explore.md': `## After This\n\n- \`/prd\` — generate a PRD from the selected solution\n- \`/plan\` — create implementation plan for the chosen approach`,
  'finops-audit.md': `## After This\n\n- \`/plan\` — create cost reduction task list from audit findings\n- \`/iac-review\` — review Terraform for the flagged resources`,
  'modernize.md': `## After This\n\n- \`/tdd\` — write tests before migrating legacy code\n- \`/plan\` — create detailed migration plan\n- \`/code-review\` — review migrated code`,
  'onboard.md': `## After This\n\n- \`/tdd\` — validate the setup script works on a clean environment\n- \`/setup-dev\` — run the generated setup script`,
  'orchestrate.md': `## After This\n\n- \`/tdd\` — add integration tests for the orchestrated workflow\n- \`/code-review\` — review orchestration implementation`,
  'plan.md': `## After This\n\n- \`/tdd\` — implement the plan with test-driven development\n- \`/breakdown\` — decompose plan into atomic tasks`,
  'prd.md': `## After This\n\n- \`/plan\` — create implementation plan from the PRD\n- \`/tdd\` — start implementation with test-driven development`,
  'refactor.md': `## After This\n\n- \`/tdd\` — add or update tests after refactoring\n- \`/code-review\` — review refactored code\n- \`/verify\` — confirm build + tests pass after refactor`,
  'triage.md': `## After This\n\n- \`/plan\` — create implementation plan for triaged issues\n- \`/breakdown\` — decompose the highest-priority issue`,
  'verify.md': `## After This\n\n- \`/tdd\` — fix failing tests or add missing coverage\n- \`/build-fix\` — fix compilation errors blocking the build`,

  // AT-L: learning commands
  'evolve.md': `## After This\n\n- \`/learn-eval\` — evaluate session quality before evolving instincts\n- \`/instinct-status\` — check evolved instinct scores`,
  'instinct-export.md': `## After This\n\n- \`/instinct-import\` — import exported instincts on the target project`,
  'instinct-import.md': `## After This\n\n- \`/instinct-status\` — verify imported instincts are active`,
  'instinct-outcome.md': `## After This\n\n- \`/evolve\` — trigger instinct evolution when enough outcomes are collected`,
  'instinct-projects.md': `## After This\n\n- \`/instinct-status\` — check instinct scores for the listed projects`,
  'instinct-promote.md': `## After This\n\n- \`/skill-create\` — create a skill from the promoted instinct pattern`,
  'learn-eval.md': `## After This\n\n- \`/evolve\` — evolve instincts from the evaluated sessions\n- \`/instinct-status\` — check current instinct scores`,
  'learning-audit.md': `## After This\n\n- \`/evolve\` — fix learning gaps found in the audit\n- \`/system-review components\` — full system review if audit finds systemic issues`,

  // AT-S: setup commands
  'backstage-setup.md': `## After This\n\n- \`/golden-path\` — create Golden Path templates in the configured Backstage\n- \`/tdd\` — add tests for custom Backstage plugins`,
  'cursor-setup.md': `## After This\n\n- \`/doctor\` — verify clarc installation health\n- \`/quickstart\` — run interactive onboarding`,
  'mcp-setup.md': `## After This\n\n- \`/doctor\` — verify MCP server connectivity`,
  'oss-setup.md': `## After This\n\n- \`/setup-ci\` — configure CI/CD for the open source project\n- \`/tdd\` — add tests before the first public release`,
  'project-init.md': `## After This\n\n- \`/tdd\` — start building with test-driven development\n- \`/setup-ci\` — configure CI/CD pipeline`,
  'setup-ci.md': `## After This\n\n- \`/tdd\` — verify tests run correctly in the new CI pipeline\n- \`/doctor\` — confirm clarc is configured correctly in CI`,
  'setup-dev.md': `## After This\n\n- \`/doctor\` — verify the development environment is healthy\n- \`/tdd\` — start development with test-driven development`,

  // AT-M: remaining commands
  'add-observability.md': `## After This\n\n- \`/tdd\` — add tests for observability instrumentation\n- \`/slo\` — define SLIs and SLOs for the instrumented service`,
  'analyze-feedback.md': `## After This\n\n- \`/brainstorm\` — generate ideas from clustered feedback themes\n- \`/idea\` — capture the highest-priority idea`,
  'brainstorm.md': `## After This\n\n- \`/idea\` — capture the best idea for evaluation\n- \`/evaluate\` — evaluate the idea for Go/No-Go`,
  'cfp.md': `## After This\n\n- \`/slide-deck\` — build the slide deck for the accepted talk\n- \`/talk-outline\` — structure the talk before building slides`,
  'chaos-experiment.md': `## After This\n\n- \`/resilience-audit\` — audit resilience after experiment findings\n- \`/slo\` — update SLOs based on experiment results`,
  'cli-review.md': `## After This\n\n- \`/tdd\` — add tests for CLI commands flagged in review\n- \`/code-review\` — review CLI implementation fixes`,
  'competitive-review.md': `## After This\n\n- \`/discover\` — discover product opportunities from competitive gaps\n- \`/brainstorm\` — brainstorm features to address identified gaps`,
  'contract-test.md': `## After This\n\n- \`/tdd\` — add unit tests for contract-tested components\n- \`/code-review\` — review contract test implementation`,
  'context.md': `## After This\n\n- \`/plan\` — create implementation plan using the discovered context\n- \`/breakdown\` — decompose the task based on context`,
  'database-review.md': `## After This\n\n- \`/tdd\` — add tests for flagged query issues\n- \`/security-review\` — full scan if SQL injection risks are found`,
  'debt-audit.md': `## After This\n\n- \`/refactor\` — tackle the highest-priority technical debt items\n- \`/modernize\` — create a modernization roadmap for legacy code`,
  'design-critique.md': `## After This\n\n- \`/wireframe\` — revise the wireframe based on critique feedback\n- \`/brand-identity\` — develop brand guidelines if visual identity gaps found`,
  'devex-survey.md': `## After This\n\n- \`/golden-path\` — create Golden Path templates based on survey findings\n- \`/setup-dev\` — improve the setup script based on developer pain points`,
  'dora-baseline.md': `## After This\n\n- \`/slo\` — define SLOs aligned with DORA metrics\n- \`/engineering-review\` — monthly review of DORA metric progress`,
  'edge-review.md': `## After This\n\n- \`/build-fix\` — fix edge function errors flagged in review\n- \`/security-review\` — full scan if origin bypass or secret exposure found`,
  'engineering-review.md': `## After This\n\n- \`/dora-baseline\` — re-measure DORA metrics after improvement actions\n- \`/plan\` — create action plan from review findings`,
  'event-storming.md': `## After This\n\n- \`/plan\` — create implementation plan from the event storming model\n- \`/breakdown\` — decompose bounded contexts into tasks`,
  'icon-system.md': `## After This\n\n- \`/design-system-review\` — verify icons integrate correctly with the design system\n- \`/code-review\` — review icon component implementation`,
  'idea.md': `## After This\n\n- \`/evaluate\` — evaluate the captured idea for Go/No-Go`,
  'incident.md': `## After This\n\n- \`/tdd\` — add regression tests to prevent recurrence\n- \`/slo\` — update SLOs based on incident impact`,
  'instrument.md': `## After This\n\n- \`/slo\` — define SLOs using the new instrumentation\n- \`/tdd\` — add tests for instrumentation code`,
  'llm-eval.md': `## After This\n\n- \`/tdd\` — add unit tests for eval harness logic\n- \`/prompt-review\` — review prompts based on eval findings`,
  'migrate.md': `## After This\n\n- \`/tdd\` — add tests for migrated schema and data\n- \`/database-review\` — review migration queries and indexes`,
  'mlops-review.md': `## After This\n\n- \`/tdd\` — add tests for ML pipeline components\n- \`/slo\` — define model serving SLOs`,
  'mobile-release.md': `## After This\n\n- \`/tdd\` — add regression tests before the next release\n- \`/release\` — cut the release after mobile build passes`,
  'multi-backend.md': `## After This\n\n- \`/tdd\` — add integration tests for the multi-backend workflow\n- \`/code-review\` — review backend implementation`,
  'multi-frontend.md': `## After This\n\n- \`/tdd\` — add tests for micro-frontend integration\n- \`/code-review\` — review frontend implementation`,
  'multi-workflow.md': `## After This\n\n- \`/tdd\` — add tests for the multi-model workflow\n- \`/code-review\` — review workflow implementation`,
  'overnight.md': `## After This\n\n- \`/learn-eval\` — evaluate the overnight session quality\n- \`/evolve\` — evolve instincts from overnight findings`,
  'privacy-audit.md': `## After This\n\n- \`/security-review\` — full DevSecOps scan if PII exposure found\n- \`/tdd\` — add GDPR compliance tests`,
  'promote-skill.md': `## After This\n\n- \`/skill-depth\` — verify the promoted skill's quality score\n- \`/system-review components\` — re-run component review after promotion`,
  'prompt-review.md': `## After This\n\n- \`/prompt-audit\` — audit the full prompt system after individual fixes\n- \`/tdd\` — add eval tests for the reviewed prompt`,
  'release.md': `## After This\n\n- \`/tdd\` — ensure all tests pass before publishing\n- \`/mobile-release\` — run mobile release workflow if this is a mobile app`,
  'slide-deck.md': `## After This\n\n- \`/talk-outline\` — structure the talk narrative before finalising slides\n- \`/design-critique\` — get feedback on slide design`,
  'slo.md': `## After This\n\n- \`/instrument\` — add instrumentation to measure the defined SLOs\n- \`/engineering-review\` — include SLO progress in the monthly review`,
  'skill-create.md': `## After This\n\n- \`/skill-depth\` — verify the new skill's quality score\n- \`/promote-skill\` — promote the skill to the global clarc registry`,
  'skill-depth.md': `## After This\n\n- \`/promote-skill\` — promote high-quality skills to the global registry\n- \`/system-review components\` — re-run component review after skill improvements`,
  'skill-impact.md': `## After This\n\n- \`/system-review components\` — full system review if high-impact skills are missing`,
  'team-sync.md': `## After This\n\n- \`/doctor\` — verify clarc health after syncing\n- \`/update-rules\` — apply latest rules after sync`,
  'update-codemaps.md': `## After This\n\n- \`/update-docs\` — update documentation after codemap refresh\n- \`/doc-updater\` — full documentation sync`,
  'update-docs.md': `## After This\n\n- \`/code-review\` — review documentation changes\n- \`/release\` — include doc updates in the next release`,
  'update-rules.md': `## After This\n\n- \`/doctor\` — verify clarc health after rules update\n- \`/system-review quick\` — validate wiring after rule changes`,
  'visual-test.md': `## After This\n\n- \`/code-review\` — review visual test implementation\n- \`/tdd\` — add unit tests alongside visual regression tests`,
  'wasm-review.md': `## After This\n\n- \`/wasm-build\` — fix build issues flagged in review\n- \`/security-review\` — full scan for unsafe blocks`,
  'workflow-check.md': `## After This\n\n- \`/system-review full\` — full system review after workflow gaps are fixed\n- \`/competitive-review\` — compare clarc workflow coverage against competitors`,
  'zero-trust-review.md': `## After This\n\n- \`/security-review\` — full DevSecOps scan after zero-trust fixes\n- \`/tdd\` — add policy tests for NetworkPolicy and AuthorizationPolicy`,
  'instinct-report.md': `## After This\n\n- \`/evolve\` — trigger instinct evolution from high-confidence patterns\n- \`/instinct-promote\` — promote the highest-rated instincts`,
  'instinct-status.md': `## After This\n\n- \`/evolve\` — trigger instinct evolution if enough outcomes are collected`,
  'brand-identity.md': `## After This\n\n- \`/design-critique\` — get critique on the developed brand identity\n- \`/visual-test\` — add visual regression tests for brand token implementation`,
  'golden-path.md': `## After This\n\n- \`/tdd\` — add tests for Golden Path templates\n- \`/setup-dev\` — verify the Golden Path setup script works`,
  'quickstart.md': `## After This\n\n- \`/clarc-way\` — interactive workflow guide for the next task\n- \`/tdd\` — start your first feature with test-driven development`,
  'sbom.md': `## After This\n\n- \`/supply-chain-audit\` — run before SBOM generation to check GitHub Actions pinning, SLSA, and provenance\n- \`/security-review\` — full DevSecOps scan if HIGH/CRITICAL vulnerabilities are found in the SBOM`,
  'evaluate.md': `## After This\n\n- \`/explore\` — design solution options for a Go recommendation\n- \`/prd\` — write the PRD if evaluation recommends proceeding`,
  'discover.md': `## After This\n\n- \`/brainstorm\` — generate ideas from discovered opportunities\n- \`/idea\` — capture the best discovery as a structured idea`,
  'profile.md': `## After This\n\n- \`/slo\` — define performance SLOs based on profiling results\n- \`/tdd\` — add performance regression tests`,
  'security-review.md': `## After This\n\n- \`/tdd\` — add security regression tests for fixed vulnerabilities\n- \`/dep-update\` — upgrade vulnerable dependencies found in the scan`,

  // AT-R14 duplicate is java-review (already covered above)
  // setup-pm is a separate command
  'setup-pm.md': `## After This\n\n- \`/doctor\` — verify package manager configuration is correct`,

  // android-review
  'android-review.md': `## After This\n\n- \`/tdd\` — add tests for Android code that failed review\n- \`/mobile-release\` — run release checks after fixes are applied`,

  // c-review
  'c-review.md': `## After This\n\n- \`/tdd\` — add tests for C code that failed review\n- \`/security-review\` — full scan if memory safety issues found`,

  // rust-review
  'rust-review.md': `## After This\n\n- \`/tdd\` — add tests for Rust code that failed review\n- \`/rust-build\` — fix compilation errors\n- \`/security-review\` — full scan if unsafe blocks are flagged`,

  // typescript-review
  'typescript-review.md': `## After This\n\n- \`/tdd\` — add tests for TypeScript code that failed review\n- \`/typescript-build\` — fix type errors flagged during review\n- \`/security-review\` — full scan if security issues found`,
}

let added = 0
let skipped = 0
let notFound = 0

for (const [filename, afterThisContent] of Object.entries(AFTER_THIS_MAP)) {
  const filePath = path.join(COMMANDS_DIR, filename)

  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP (not found): ${filename}`)
    notFound++
    continue
  }

  const content = fs.readFileSync(filePath, 'utf8')

  // Skip if already has ## After This
  if (content.includes('## After This')) {
    skipped++
    continue
  }

  // Append After This section
  const newContent = content.trimEnd() + '\n\n' + afterThisContent + '\n'
  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`  ADDED: ${filename}`)
  added++
}

console.log(`\nDone. Added: ${added}, Already had it: ${skipped}, Not found: ${notFound}`)
