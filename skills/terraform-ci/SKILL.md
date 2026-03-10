---
name: terraform-ci
description: Terraform in CI/CD — plan on PR, apply on merge, OIDC auth, drift detection, importing existing resources, common CLI commands, anti-patterns, and Terraform vs Pulumi vs CDK decision guide.
---

# Terraform CI/CD & Operations

## When to Activate

- Setting up GitHub Actions (or other CI) to run `terraform plan` on pull requests
- Configuring OIDC-based AWS authentication for CI (no stored credentials)
- Importing existing cloud resources under Terraform control
- Deciding between Terraform, Pulumi, and AWS CDK for a new project
- Looking up common Terraform CLI commands
- Reviewing anti-patterns (local state, secrets in tfvars, count=0 to disable)

> For project structure, remote state setup, module design, workspace strategy, ECS/IAM patterns — see skill `terraform-patterns`.

## CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # OIDC for AWS auth (no stored credentials)
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/github-terraform
          aws-region: eu-west-1

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: '~1.14'

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/environments/prod

      - name: Terraform Validate
        run: terraform validate
        working-directory: infrastructure/environments/prod

      - name: Terraform Plan
        id: plan
        run: |
          terraform plan -var="db_password=${{ secrets.DB_PASSWORD }}" \
            -out=plan.tfplan -no-color 2>&1 | tee plan.txt
        working-directory: infrastructure/environments/prod

      - name: Comment Plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const plan = require('fs').readFileSync('infrastructure/environments/prod/plan.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `\`\`\`hcl\n${plan.slice(0, 65000)}\n\`\`\``
            });

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production   # requires manual approval in GitHub
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/github-terraform
          aws-region: eu-west-1
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
        working-directory: infrastructure/environments/prod
      - run: terraform apply -auto-approve -var="db_password=${{ secrets.DB_PASSWORD }}"
        working-directory: infrastructure/environments/prod
```

---

## Importing Existing Resources

```bash
# Bring existing AWS resource under Terraform control
terraform import aws_s3_bucket.uploads my-existing-bucket-name
terraform import aws_security_group.rds sg-0abc123def456

# After import: run plan to check drift
terraform plan
# Fix .tf files until plan shows "No changes"
```

---

## Common Commands

```bash
terraform init          # download providers + configure backend
terraform validate      # check syntax and references
terraform fmt -recursive # format all .tf files
terraform plan          # preview changes (never modifies infra)
terraform apply         # apply the plan (prompts for confirmation)
terraform apply -auto-approve  # skip confirmation (CI only)
terraform destroy       # destroy everything (use with extreme care)
terraform state list    # list all managed resources
terraform state show aws_db_instance.main  # inspect state of one resource
terraform output        # print outputs
terraform graph | dot -Tpng > graph.png  # visualize dependency graph
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Local state (no backend) | Lost on disk failure, no team sharing | S3 + DynamoDB locking from day 1 |
| Secrets in `.tfvars` committed to git | Credential exposure | Pass via CI env vars or Secrets Manager |
| `count = 0` to "disable" resources | Leaves dangling state | Remove the resource block + `terraform state rm` |
| Manual changes in console | State drift — next `plan` tries to revert | All changes through Terraform |
| No `deletion_protection` on prod DB | Accidental `destroy` deletes production data | Always set on prod databases |
| One giant `main.tf` | Impossible to navigate | Split by concern: `vpc.tf`, `rds.tf`, `ecs.tf` |
| `depends_on` overuse | Hides missing implicit references | Fix the reference chain instead |
| `ignore_changes` for everything | Terraform loses awareness of drift | Only ignore what autoscaling legitimately changes |

---

## Terraform vs. Pulumi vs. AWS CDK — When to Use What

Terraform is the right choice in many situations, but modern IaC alternatives (Pulumi, AWS CDK) offer advantages worth evaluating for new projects.

### Decision Matrix

| Criterion | Terraform HCL | Pulumi | AWS CDK |
|-----------|:-------------:|:------:|:-------:|
| Multi-cloud support | ✅ Best (3000+ providers) | ✅ Good | ❌ AWS only |
| Real programming language | ❌ HCL DSL | ✅ TS/Python/Go | ✅ TS/Python/Java |
| Unit testing infrastructure | ❌ | ✅ | ✅ |
| Type safety + IDE autocomplete | ❌ | ✅ | ✅ |
| Native loops & conditionals | ⚠️ `count`/`for_each` | ✅ | ✅ |
| Existing Terraform state migration | ✅ N/A | ⚠️ Via cdktf | ❌ |
| Provider ecosystem maturity | ✅ Largest | ✅ Uses TF providers | ⚠️ AWS-specific |
| Reusable abstractions | Modules | ComponentResource | L3 Constructs |
| Governance / policy | Sentinel / OPA | CrossGuard | CDK Aspects + OPA |
| Team HCL familiarity | ✅ | ❌ | ❌ |

### When to Stay with Terraform

- Existing large Terraform codebase — migration cost outweighs benefits
- Multi-cloud with providers not available in Pulumi (niche SaaS providers)
- Team is HCL-fluent and finds DSL simpler than TypeScript for infra
- Terraform Cloud governance (Sentinel policies, team VCS integration) is a requirement
- Working with providers only available via Terraform Registry

### When to Choose Pulumi

- New project and team writes TypeScript/Python/Go daily — same language for infra and app
- Need real unit tests for infrastructure code (`pulumi.runtime.setMocks`)
- Multi-cloud: deploy to AWS + GCP + Azure + Kubernetes in one program
- Need complex dynamic resource generation (lists of services, conditional resource graphs)
- CrossGuard policy enforcement in CI is a requirement

### When to Choose AWS CDK

- AWS-only infrastructure (no multi-cloud requirement)
- Team values strong defaults (L2 Constructs include encryption, proper IAM by default)
- Publishing reusable constructs to Construct Hub for other teams to consume
- Need CDK Pipelines for self-mutating CI/CD
- tighter AWS service integration and early access to new AWS services

### Hybrid Strategy: Terraform + Pulumi/CDK

For large organizations, a hybrid works well:
- **Terraform** manages foundational infrastructure: VPCs, accounts, DNS, IAM org-wide roles
- **Pulumi/CDK** manages application-specific resources: ECS services, databases, queues
- Pulumi/CDK reads Terraform outputs via remote state (`terraform_remote_state` or `pulumi.StackReference`)

```typescript
// Pulumi: read VPC from existing Terraform state
const tfState = new pulumi.StackReference("tf-networking/prod");
const vpcId = tfState.getOutput("vpc_id");

// Use VPC created by Terraform in a Pulumi resource
const service = new aws.ecs.Service("api", {
  networkConfiguration: {
    subnets: tfState.getOutput("private_subnet_ids").apply(ids => ids as string[]),
  },
});
```

### Migration Path: Terraform → Pulumi

If migrating an existing Terraform codebase:

1. Use `pulumi convert --from terraform` to auto-convert HCL to TypeScript/Python
2. Import existing state with `pulumi import` (matches existing resources without recreating)
3. Migrate module by module — keep Terraform for unmigrated modules, use Pulumi for new ones
4. Run `pulumi refresh` after import to align state with actual cloud resources

```bash
# Convert existing Terraform module to Pulumi TypeScript
pulumi convert --from terraform --language typescript ./infra/modules/vpc
```

---

## Related Skills

- `iac-modern-patterns` — Pulumi TypeScript, AWS CDK L1/L2/L3, Bicep, cdktf — full reference for non-HCL IaC
- `kubernetes-patterns` — Kubernetes resource management (Terraform can provision clusters, Helm provider manages workloads)
- `devsecops-patterns` — Checkov, OPA/Conftest for IaC compliance scanning in CI
- `ci-cd-patterns` — GitHub Actions integration for Terraform plan/apply pipelines
