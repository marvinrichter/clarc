---
description: IaC code review for Pulumi and AWS CDK — abstractions, security hardening, tagging, unit tests, multi-environment separation, drift detection, and compliance policy coverage.
---

# IaC Review

Performs a comprehensive code review of Pulumi (TypeScript/Python) or AWS CDK infrastructure code.

## What This Command Does

1. **Abstractions** — verify reusable ComponentResources / L3 Constructs instead of copy-paste
2. **Security** — encryption at rest/transit, no public buckets, least-privilege IAM
3. **Unit Tests** — verify construct/component tests exist and pass
4. **Tagging** — all resources tagged with required keys (Environment, ManagedBy, Team)
5. **Multi-Environment** — clean separation via Stacks/config (no hardcoded env-specific values)
6. **Drift** — state up-to-date, no manual cloud changes bypassing IaC
7. **Compliance** — OPA/Conftest policies exist and pass

## When to Use

Use `/iac-review` when:
- Adding new Pulumi programs or CDK stacks to the codebase
- Writing new ComponentResources or L3 Constructs
- Reviewing infrastructure PRs before merge
- Post-incident infrastructure audit
- Migrating from Terraform to Pulumi or CDK
- Compliance audit of cloud resources

## Review Process

### Step 1 — Project Structure Audit

```bash
# Identify IaC files
find . -name "Pulumi.yaml" -o -name "cdk.json" -o -name "Pulumi.*.yaml" | head -20

# Check for reusable components/constructs
ls infra/components/ 2>/dev/null || ls lib/constructs/ 2>/dev/null || ls constructs/ 2>/dev/null
# FAIL: No components directory — resource definitions copied inline everywhere

# Check for copy-paste anti-pattern (same resource type defined in multiple places)
grep -r "new aws.s3.Bucket\|new s3.Bucket" infra/ --include="*.ts" | wc -l
# WARN if count > 3 without a shared component
```

### Step 2 — Security Review

#### Pulumi

```bash
# Find S3 buckets without encryption
grep -A 20 "new aws.s3.Bucket" infra/ --include="*.ts" -r | \
  grep -v "serverSideEncryption\|BucketEncryption"

# Find public S3 buckets
grep -r "acl.*public\|publicReadAccess.*true" infra/ --include="*.ts"

# Find security groups with 0.0.0.0/0 ingress
grep -r "cidrBlocks.*0\.0\.0\.0/0\|fromPort.*0.*toPort.*65535" infra/ --include="*.ts"

# Find IAM roles with admin access
grep -r "AdministratorAccess\|Action.*\*.*Resource.*\*" infra/ --include="*.ts"

# Check for secrets hardcoded (should use pulumi.Config with secret flag)
grep -r "password\|secret\|token\|apiKey" infra/ --include="*.ts" | grep -v "config\.\|secret\(\)"
```

#### CDK

```bash
# S3 without encryption
grep -r "new s3.Bucket" lib/ cdk/ infra/ --include="*.ts" | \
  grep -v "encryption\|BucketEncryption"

# S3 public access not blocked
grep -r "blockPublicAccess" lib/ --include="*.ts"
# Every Bucket should have: blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL

# CDK: Check for wildcard permissions in IAM
grep -r "grantAllPermissions\|PolicyStatement.*actions.*\*" lib/ --include="*.ts"

# Verify HTTPS-only for S3 bucket policies
grep -r "enforceSSL\|SecureTransport" lib/ --include="*.ts"
```

### Step 3 — Unit Tests

```bash
# Verify tests exist
ls infra/test/ lib/__tests__/ test/ 2>/dev/null
# FAIL: No test directory found

# Run IaC unit tests
# Pulumi:
cd infra && npm test
# CDK:
cd cdk && npx jest

# Check test coverage for constructs
# Every ComponentResource/L3 Construct should have:
# 1. At least one property test (e.g., encryption enabled)
# 2. At least one security test (e.g., no public access)

# Count tests vs constructs ratio
find . -name "*.test.ts" | wc -l
find . -name "*.ts" -path "*/constructs/*" -o -path "*/components/*" | wc -l
# WARN if tests < constructs
```

### Step 4 — Tagging Compliance

```bash
# Pulumi: find resources without required tags
grep -r "new aws\." infra/ --include="*.ts" -A 10 | grep -v "tags:"
# Note: look for resources that are missing tags entirely

# Check required tags are applied consistently
grep -r '"Environment"' infra/ --include="*.ts" | wc -l
grep -r '"ManagedBy"' infra/ --include="*.ts" | wc -l
grep -r '"Team"' infra/ --include="*.ts" | wc -l

# CDK: Check for required tags via Aspects
grep -r "Aspects.of\|TagManager\|cdk.Tags" lib/ --include="*.ts"
# PASS: Tags applied via Aspect (ensures all resources tagged)
# WARN: Tags only on individual resources (easy to miss new ones)
```

### Step 5 — Multi-Environment Separation

```bash
# Pulumi: verify no hardcoded environment names
grep -r '"prod"\|"staging"\|"dev"' infra/ --include="*.ts" | grep -v "config\.\|Config\(\)"
# FAIL: hardcoded environment strings (should come from config)

# Verify stack-specific config files exist
ls infra/Pulumi.dev.yaml infra/Pulumi.staging.yaml infra/Pulumi.prod.yaml 2>/dev/null
# FAIL: Only one Pulumi.yaml — no environment separation

# CDK: verify environment-specific stacks
grep -r "new.*Stack.*env:" bin/ --include="*.ts"
# Should show dev + prod stacks with different account/region/sizing

# CDK: verify no environment-specific logic in Construct code
grep -r "process.env.NODE_ENV\|context.get.*env" lib/constructs/ --include="*.ts"
# FAIL: constructs should not read env directly; receive via props
```

### Step 6 — Drift Detection

```bash
# Pulumi: detect drift (compare state with actual cloud resources)
cd infra && pulumi refresh --stack prod --preview
# Review output for: resources that changed outside of Pulumi

# CDK: detect CloudFormation drift
STACK_NAME=$(aws cloudformation list-stacks --query "StackSummaries[?StackStatus=='CREATE_COMPLETE'].StackName" --output text | head -1)
aws cloudformation detect-stack-drift --stack-name "$STACK_NAME"
DETECTION_ID=$(aws cloudformation detect-stack-drift --stack-name "$STACK_NAME" --query StackDriftDetectionId --output text)
aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id "$DETECTION_ID"

# Flag: any manually created resources not in IaC
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=ManagedBy,Values=pulumi,terraform,cdk \
  --query 'ResourceTagMappingList[].ResourceARN' | wc -l
# Compare with total resource count to find unmanaged resources
```

### Step 7 — Compliance Policies

```bash
# Check if OPA/Conftest policies exist
ls policy/ infra/policy/ 2>/dev/null
# FAIL: No policy directory

# Pulumi: run CrossGuard policies
cd infra && pulumi preview --policy-pack policy/

# CDK: generate template and run conftest
cdk synth 2>/dev/null | conftest test - --policy policy/

# Run Checkov against generated IaC
pip install checkov 2>/dev/null
# Pulumi (generated Terraform plan):
checkov -d infra/ --framework pulumi

# CDK (CloudFormation):
cdk synth > /tmp/cfn.json
checkov -f /tmp/cfn.json --framework cloudformation
```

## Review Categories

### CRITICAL (Block Deployment)

- S3 bucket with public read/write access
- IAM role with `*` actions on `*` resources (wildcard admin)
- RDS instance publicly accessible (`publiclyAccessible: true`)
- Secrets hardcoded in IaC code (not via `pulumi.Config` secret or CDK SecretManager)
- No encryption at rest for databases or storage

### HIGH (Fix Before Merge)

- No unit tests for any L3 Construct or ComponentResource
- Hardcoded environment-specific values (URLs, sizing) instead of config/props
- Security groups with `0.0.0.0/0` ingress on non-HTTP ports
- Missing required tags (Environment, ManagedBy) on billable resources
- Significant drift detected (resources changed outside IaC)

### MEDIUM (Address Next Sprint)

- Copy-paste resource definitions instead of reusable components
- Missing OPA/Conftest compliance policies
- CloudFormation/Pulumi stack has no drift detection schedule
- Stack destruction policy not set (risk of data loss on `stack destroy`)
- CDK Aspects not used for cross-cutting concerns (tagging, encryption enforcement)

## Pulumi vs CDK Decision Guide

| Situation | Recommendation |
|-----------|----------------|
| AWS-only infrastructure | CDK — tighter native integration, better L2 defaults |
| Multi-cloud (AWS + GCP + Azure) | Pulumi — single language, all providers |
| Existing Terraform provider needed | Pulumi or cdktf |
| Team knows TypeScript/Python deeply | Either |
| Need Construct Hub publishing | CDK |
| Need CrossGuard policy enforcement | Pulumi |

## Approval Criteria

| Status | Condition |
|--------|-----------|
| Approve | No CRITICAL or HIGH issues — tests present, no public resources, environment separation clean |
| Warn | Only MEDIUM issues — merge with documented remediation plan |
| Block | Any CRITICAL issue |

## Related

- Skill: `skills/iac-modern-patterns/` — Pulumi, CDK, Bicep, cdktf full reference
- Skill: `skills/terraform-patterns/` — Terraform (when to use vs Pulumi/CDK)
- Skill: `skills/devsecops-patterns/` — Checkov, Trivy, OPA in IaC CI pipeline
- Command: `/dep-audit` — vulnerability scanning for IaC dependencies
