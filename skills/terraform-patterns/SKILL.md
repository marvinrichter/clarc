---
name: terraform-patterns
description: "Infrastructure as Code with Terraform — project structure, remote state, modules, workspace strategy, AWS/GCP patterns, CI/CD integration, and security hardening. The standard for managing production infrastructure."
---

# Terraform Patterns

Infrastructure as Code: describe desired state → Terraform plans the diff → apply. Never manually change infrastructure that Terraform manages.

## When to Activate

- Provisioning any cloud resource (compute, databases, networking, IAM)
- Setting up remote state backend for a team
- Creating reusable infrastructure modules
- Migrating manually-created resources under Terraform control
- Reviewing infrastructure changes in CI/CD

---

## Project Structure

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf          # environment-specific resource composition
│   │   ├── variables.tf
│   │   ├── terraform.tfvars # non-secret values for dev
│   │   └── outputs.tf
│   ├── staging/
│   └── prod/
├── modules/
│   ├── vpc/                 # reusable VPC module
│   ├── ecs-service/         # reusable ECS service module
│   ├── rds-postgres/        # reusable RDS module
│   └── cdn/                 # CloudFront + S3 origin
└── shared/
    └── backend.tf           # shared state backend config
```

**Rule:** Every environment is an isolated Terraform root. `modules/` are reusable, parameterized building blocks. Never put resources directly in `modules/` — only in `environments/`.

---

## Remote State — Mandatory for Teams

State must be remote + locked. Local state in git = team conflicts and drift.

### AWS S3 + DynamoDB backend

```hcl
# infrastructure/environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"  # prevents concurrent applies
  }
}
```

### Bootstrap the backend (one-time)

```hcl
# infrastructure/bootstrap/main.tf — apply this FIRST, before anything else
resource "aws_s3_bucket" "tf_state" {
  bucket = "my-company-terraform-state"
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}
```

---

## Module Pattern

```hcl
# modules/rds-postgres/main.tf
variable "identifier"        { type = string }
variable "instance_class"    { type = string; default = "db.t4g.micro" }
variable "allocated_storage" { type = number; default = 20 }
variable "db_name"           { type = string }
variable "username"          { type = string }
variable "password"          { type = string; sensitive = true }
variable "subnet_ids"        { type = list(string) }
variable "vpc_id"            { type = string }
variable "ingress_sg_ids"    { type = list(string) }
variable "environment"       { type = string }

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "rds" {
  name   = "${var.identifier}-rds-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.ingress_sg_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "this" {
  identifier           = var.identifier
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_encrypted    = true                    # always encrypt
  db_name              = var.db_name
  username             = var.username
  password             = var.password
  db_subnet_group_name = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7                    # 7-day PITR
  deletion_protection     = var.environment == "prod"
  skip_final_snapshot     = var.environment != "prod"

  multi_az               = var.environment == "prod"
  publicly_accessible    = false                 # never public

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "endpoint" { value = aws_db_instance.this.endpoint }
output "sg_id"    { value = aws_security_group.rds.id }
```

### Consuming the module

```hcl
# environments/prod/main.tf
module "postgres" {
  source = "../../modules/rds-postgres"

  identifier     = "myapp-prod"
  instance_class = "db.t4g.medium"
  db_name        = "myapp"
  username       = "myapp"
  password       = var.db_password   # from tfvars or secret manager
  subnet_ids     = module.vpc.private_subnet_ids
  vpc_id         = module.vpc.vpc_id
  ingress_sg_ids = [module.api.security_group_id]
  environment    = "prod"
}
```

---

## Variables and Secrets

```hcl
# variables.tf
variable "environment"  { type = string }
variable "region"       { type = string; default = "eu-west-1" }
variable "db_password"  {
  type      = string
  sensitive = true   # never shown in plan output or logs
}
```

```hcl
# terraform.tfvars (commit this — non-secret values only)
environment = "prod"
region      = "eu-west-1"
```

**Secrets strategy:**
```bash
# Option A: Pass at apply time (CI/CD)
terraform apply -var="db_password=$DB_PASSWORD"

# Option B: AWS Secrets Manager — fetch in Terraform
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "myapp/prod/db-password"
}
# Then: jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)["password"]

# Option C: Vault provider for HashiCorp Vault
```

**NEVER** put secrets in `terraform.tfvars` or hardcode them in `.tf` files.

---

## Workspace Strategy

```bash
# Workspaces are for lightweight environment separation
# within the SAME backend config (same bucket, different state key)

terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
terraform workspace select prod

# Reference current workspace in resources
resource "aws_s3_bucket" "uploads" {
  bucket = "myapp-${terraform.workspace}-uploads"
}
```

**When to use workspaces vs. separate directories:**
- **Workspaces**: same infra shape across envs (all have same resources, different sizes)
- **Separate dirs**: envs have fundamentally different resource sets (prod has WAF, dev doesn't)

---

## ECS + Fargate Pattern

```hcl
# modules/ecs-service/main.tf
resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = var.service_name
    image     = var.container_image
    essential = true
    portMappings = [{ containerPort = var.port, protocol = "tcp" }]
    environment = [for k, v in var.env_vars : { name = k, value = v }]
    secrets     = [for k, v in var.secrets : { name = k, valueFrom = v }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.service_name}"
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.service_name
    container_port   = var.port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true   # auto-rollback on failed deployment
  }

  lifecycle {
    ignore_changes = [desired_count]  # let autoscaling manage count
  }
}
```

---

## IAM — Least Privilege

```hcl
# Task role: what the container can DO
resource "aws_iam_role_policy" "task" {
  name   = "${var.service_name}-task-policy"
  role   = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${var.uploads_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.db_secret_arn
      }
    ]
  })
}

# Never use AdministratorAccess or * resources on task roles
```

---

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
          terraform_version: '~1.9'

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
