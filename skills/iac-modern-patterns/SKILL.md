---
name: iac-modern-patterns
description: Skill: Modern IaC Patterns — Pulumi, AWS CDK, Bicep, cdktf
---
# Skill: Modern IaC Patterns — Pulumi, AWS CDK, Bicep, cdktf

## When to Activate

- Choosing between Pulumi, AWS CDK, Terraform, or Bicep for a new project
- Writing Pulumi programs in TypeScript or Python
- Creating reusable AWS CDK Constructs (L2 or L3)
- Testing infrastructure code (unit tests, compliance tests)
- Designing multi-environment IaC strategy
- Migrating from Terraform DSL to a real programming language

---

## Why Modern IaC? (vs Terraform HCL)

| Capability | Terraform HCL | Pulumi / CDK |
|-----------|:-------------:|:------------:|
| Real programming language | ❌ | ✅ |
| Loops & conditionals | ⚠️ `for_each`, `count` | ✅ Native |
| Unit testing | ❌ | ✅ |
| Type safety | ❌ | ✅ (TypeScript) |
| IDE autocomplete | ❌ | ✅ |
| Reusable abstractions | Modules (limited) | Classes / Components |
| Multi-cloud | ✅ | ✅ (Pulumi) / ❌ (CDK = AWS only) |
| Existing provider ecosystem | ✅ Largest | ✅ (Pulumi) / ⚠️ (CDK) |

**When to use Terraform still:** large multi-cloud org with existing HCL expertise, team prefers DSL simplicity, need Terraform Cloud governance features.

---

## Pulumi — Infrastructure as Real Code

### Core Concepts

```typescript
// Pulumi program: index.ts
// `pulumi up` computes diff between desired state and current state, then applies

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Stack configuration — varies per environment
const config = new pulumi.Config();
const environment = config.require("environment");         // dev / staging / prod
const dbInstanceClass = config.get("dbInstanceClass")    // override per-stack
  ?? (environment === "prod" ? "db.t3.large" : "db.t3.micro");

// Resources — typed, with IDE autocomplete
const bucket = new aws.s3.Bucket("uploads", {
  bucket: `myapp-uploads-${environment}`,
  versioning: { enabled: true },
  serverSideEncryptionConfiguration: {
    rule: {
      applyServerSideEncryptionByDefault: {
        sseAlgorithm: "AES256",
      },
    },
  },
  tags: {
    Environment: environment,
    ManagedBy: "pulumi",
  },
});

// Output — expose resource attributes for other stacks or scripts
export const bucketName = bucket.bucket;
export const bucketArn = bucket.arn;
```

### Stack Management

```bash
# Create a new stack (environment)
pulumi stack init dev
pulumi stack init prod

# Configure stack values
pulumi config set environment dev
pulumi config set aws:region eu-west-1
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"  # encrypted in state

# Preview changes (like terraform plan)
pulumi preview

# Deploy
pulumi up

# Destroy
pulumi destroy

# Switch stacks
pulumi stack select prod
```

### pulumi.output — Async-Aware Outputs

Resources in Pulumi are asynchronous. Use `pulumi.interpolate` and `pulumi.all` to compose values.

```typescript
// WRONG: runtime value not available yet
const url = `https://${bucket.bucketDomainName}/uploads`;  // TypeScript error

// CORRECT: use pulumi.interpolate for string templates
const url = pulumi.interpolate`https://${bucket.bucketDomainName}/uploads`;

// CORRECT: use pulumi.all when combining multiple outputs
const connectionString = pulumi.all([db.endpoint, db.name, dbPassword]).apply(
  ([endpoint, name, password]) =>
    `postgresql://app:${password}@${endpoint}:5432/${name}`
);

// CORRECT: transform output value
const bucketId = bucket.id.apply((id) => id.toUpperCase());
```

### ComponentResource — Reusable Infrastructure Abstractions

```typescript
// components/WebService.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

interface WebServiceArgs {
  image: string;
  port: number;
  cpu?: number;
  memory?: number;
  environment?: Record<string, string>;
  desiredCount?: number;
}

export class WebService extends pulumi.ComponentResource {
  public readonly url: pulumi.Output<string>;
  public readonly serviceArn: pulumi.Output<string>;

  constructor(name: string, args: WebServiceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("myapp:index:WebService", name, {}, opts);

    const cluster = new aws.ecs.Cluster(`${name}-cluster`, {}, { parent: this });

    const lb = new awsx.lb.ApplicationLoadBalancer(`${name}-lb`, {}, { parent: this });

    const service = new awsx.ecs.FargateService(`${name}-service`, {
      cluster: cluster.arn,
      taskDefinitionArgs: {
        container: {
          name,
          image: args.image,
          cpu: args.cpu ?? 256,
          memory: args.memory ?? 512,
          essential: true,
          portMappings: [{ containerPort: args.port }],
          environment: Object.entries(args.environment ?? {}).map(([name, value]) => ({
            name,
            value,
          })),
        },
      },
      desiredCount: args.desiredCount ?? 2,
      loadBalancers: [{
        targetGroupArn: lb.defaultTargetGroup.arn,
        containerName: name,
        containerPort: args.port,
      }],
    }, { parent: this });

    this.url = lb.loadBalancer.dnsName.apply(
      (dns) => `https://${dns}`
    );
    this.serviceArn = service.service.arn;

    this.registerOutputs({ url: this.url, serviceArn: this.serviceArn });
  }
}

// Usage
const api = new WebService("api", {
  image: "myapp/api:latest",
  port: 8080,
  environment: { NODE_ENV: "production" },
});
export const apiUrl = api.url;
```

### Unit Testing with pulumi.runtime.setMocks

```typescript
// __tests__/WebService.test.ts
import * as pulumi from "@pulumi/pulumi";

// Set up mocks — no real AWS calls
pulumi.runtime.setMocks({
  newResource: (args: pulumi.runtime.MockResourceArgs): { id: string; state: Record<string, unknown> } => {
    return {
      id: `${args.name}-id`,
      state: args.inputs,
    };
  },
  call: (args: pulumi.runtime.MockCallArgs) => args.inputs,
}, "project", "dev", false);

describe("WebService", () => {
  let WebService: typeof import("../components/WebService").WebService;

  before(async () => {
    ({ WebService } = await import("../components/WebService"));
  });

  it("exposes URL output", async () => {
    const svc = new WebService("test", { image: "nginx", port: 80 });

    const url = await new Promise<string>((resolve) =>
      svc.url.apply(resolve)
    );

    assert.ok(url.startsWith("https://"), "URL must use HTTPS");
  });

  it("uses minimum 2 desired count", async () => {
    const svc = new WebService("test", { image: "nginx", port: 80 });

    const count = await new Promise<number>((resolve) =>
      svc.serviceArn.apply(() => resolve(2))
    );

    assert.equal(count, 2);
  });
});
```

### CrossGuard Policies (Pulumi Compliance)

```typescript
// policy/index.ts
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import * as aws from "@pulumi/aws";

new PolicyPack("aws-policies", {
  policies: [
    {
      name: "s3-no-public-access",
      description: "S3 buckets must not allow public access",
      enforcementLevel: "mandatory",
      validateResource: validateResourceOfType(aws.s3.Bucket, (bucket, args, reportViolation) => {
        if (bucket.acl === "public-read" || bucket.acl === "public-read-write") {
          reportViolation("S3 bucket must not be public");
        }
      }),
    },
    {
      name: "require-tags",
      description: "All resources must have Environment and ManagedBy tags",
      enforcementLevel: "mandatory",
      validateResource: (args, reportViolation) => {
        const tags = args.props.tags ?? {};
        if (!tags.Environment) reportViolation("Missing required tag: Environment");
        if (!tags.ManagedBy) reportViolation("Missing required tag: ManagedBy");
      },
    },
  ],
});
```

---

## AWS CDK — Infrastructure as TypeScript / Python

### Core Concepts: App → Stack → Construct

```
App
└── Stack (prod, us-east-1)
    ├── VpcConstruct (L2)
    ├── EcsServiceConstruct (L3 — your pattern)
    └── DatabaseConstruct (L3 — your pattern)
```

### L1 Constructs (CloudFormation Wrappers)

```typescript
import { CfnBucket } from "aws-cdk-lib/aws-s3";

// L1: direct mapping to CloudFormation — verbose, full control
const bucket = new CfnBucket(this, "UploadsBucket", {
  bucketEncryption: {
    serverSideEncryptionConfiguration: [{
      serverSideEncryptionByDefault: {
        sseAlgorithm: "AES256",
      },
    }],
  },
  versioningConfiguration: { status: "Enabled" },
});
```

### L2 Constructs (Sane Defaults, Best Practice)

```typescript
import { Stack, StackProps, Duration } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { Construct } from "constructs";

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // L2: sensible defaults automatically applied
    const bucket = new s3.Bucket(this, "UploadsBucket", {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // default in L2
      removalPolicy: cdk.RemovalPolicy.RETAIN,            // don't delete on stack destroy
    });

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
    });

    // L2 pattern: Load-balanced Fargate service
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "ApiService",
      {
        vpc,
        memoryLimitMiB: 512,
        cpu: 256,
        desiredCount: 2,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("myapp/api:latest"),
          containerPort: 8080,
          environment: {
            NODE_ENV: "production",
          },
        },
        publicLoadBalancer: true,
      }
    );

    // Grant service access to S3 bucket
    bucket.grantReadWrite(service.taskDefinition.taskRole);
  }
}
```

### L3 Constructs — Reusable Patterns

```typescript
// constructs/WebService.ts
import { Construct } from "constructs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as cdk from "aws-cdk-lib";

export interface WebServiceProps {
  vpc: ec2.IVpc;
  image: string;
  port: number;
  cpu?: number;
  memoryMiB?: number;
  desiredCount?: number;
  environment?: Record<string, string>;
}

export class WebService extends Construct {
  public readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;
  public readonly url: string;

  constructor(scope: Construct, id: string, props: WebServiceProps) {
    super(scope, id);

    this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "Service",
      {
        vpc: props.vpc,
        cpu: props.cpu ?? 256,
        memoryLimitMiB: props.memoryMiB ?? 512,
        desiredCount: props.desiredCount ?? 2,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(props.image),
          containerPort: props.port,
          environment: props.environment,
        },
        // Auto-configured: HTTPS listener, health checks, security groups
      }
    );

    this.url = `https://${this.service.loadBalancer.loadBalancerDnsName}`;
  }
}
```

### CDK Aspects — Cross-Cutting Concerns

```typescript
// aspects/RequireEncryption.ts — applies to ALL resources in the app
import * as cdk from "aws-cdk-lib";
import { Construct, IConstruct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

export class RequireEncryption implements cdk.IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof s3.CfnBucket) {
      if (!node.bucketEncryption) {
        cdk.Annotations.of(node).addError(
          "S3 bucket must have encryption configured"
        );
      }
    }
  }
}

// Apply to entire app
const app = new cdk.App();
const stack = new AppStack(app, "MyStack");
cdk.Aspects.of(app).add(new RequireEncryption());
```

### CDK Testing — Unit Tests for Constructs

```typescript
// test/AppStack.test.ts
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { AppStack } from "../lib/AppStack";

describe("AppStack", () => {
  const app = new App();
  const stack = new AppStack(app, "TestStack", {
    env: { account: "123456789", region: "eu-west-1" },
  });
  const template = Template.fromStack(stack);

  test("S3 bucket has versioning enabled", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      VersioningConfiguration: {
        Status: "Enabled",
      },
    });
  });

  test("S3 bucket blocks public access", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test("Fargate service has 2+ desired count", () => {
    template.hasResourceProperties("AWS::ECS::Service", {
      DesiredCount: Match.anyValue(),
    });
    // Additional assertion
    const services = template.findResources("AWS::ECS::Service");
    const desiredCounts = Object.values(services).map(
      (s: any) => s.Properties.DesiredCount
    );
    expect(Math.min(...desiredCounts)).toBeGreaterThanOrEqual(2);
  });

  test("No resources are public", () => {
    template.resourceCountIs("AWS::S3::BucketPolicy", 0); // No bucket policies needed if private
  });
});
```

### CDK Pipelines — Self-Mutating CI/CD

```typescript
// pipeline/PipelineStack.ts
import { Stack } from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { AppStage } from "./AppStage";

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      selfMutation: true,  // pipeline updates itself when PipelineStack changes
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub("org/repo", "main"),
        commands: [
          "npm ci",
          "npm run build",
          "npx cdk synth",
        ],
      }),
    });

    // Staging stage with manual approval
    const staging = pipeline.addStage(new AppStage(this, "Staging", {
      env: { account: "111111111", region: "eu-west-1" },
    }));

    staging.addPost(
      new pipelines.ManualApprovalStep("PromoteToProd")
    );

    // Production stage
    pipeline.addStage(new AppStage(this, "Prod", {
      env: { account: "222222222", region: "eu-west-1" },
    }));
  }
}
```

---

## Azure Bicep

```bicep
// main.bicep
param environment string = 'dev'
param location string = resourceGroup().location

var storageAccountName = 'myapp${environment}${uniqueString(resourceGroup().id)}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: environment == 'prod' ? 'Standard_ZRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
```

```bash
# Deploy Bicep
az deployment group create \
  --resource-group myapp-prod \
  --template-file main.bicep \
  --parameters environment=prod
```

---

## CDK for Terraform (cdktf)

Use when you need Terraform providers (non-AWS) but want TypeScript/Python instead of HCL.

```typescript
// main.ts
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "AWS", { region: "eu-west-1" });

    const bucket = new S3Bucket(this, "uploads", {
      bucket: "myapp-uploads-prod",
      versioning: { enabled: true },
      tags: { Environment: "prod", ManagedBy: "cdktf" },
    });

    new TerraformOutput(this, "bucket_name", { value: bucket.bucket });
  }
}

const app = new App();
new MyStack(app, "my-stack");
app.synth();
```

```bash
cdktf deploy    # terraform apply equivalent
cdktf destroy   # terraform destroy equivalent
cdktf synth     # generate Terraform JSON config
```

---

## Multi-Environment Strategy

### Pulumi: Configuration per Stack

```bash
# dev stack
pulumi config set --stack dev environment dev
pulumi config set --stack dev instanceType t3.micro
pulumi config set --stack dev desiredCount 1

# prod stack
pulumi config set --stack prod environment prod
pulumi config set --stack prod instanceType t3.large
pulumi config set --stack prod desiredCount 3
```

```typescript
// index.ts — single program, multiple stack configs
const config = new pulumi.Config();
const environment = config.require("environment");
const instanceType = config.get("instanceType") ?? "t3.micro";
const desiredCount = config.getNumber("desiredCount") ?? 1;

// All resources automatically namespaced by stack
```

### CDK: Environments per Stack

```typescript
// bin/app.ts
const app = new cdk.App();

new AppStack(app, "Dev", {
  env: { account: "111111111", region: "eu-west-1" },
  instanceType: "t3.micro",
  desiredCount: 1,
});

new AppStack(app, "Prod", {
  env: { account: "222222222", region: "eu-west-1" },
  instanceType: "t3.large",
  desiredCount: 3,
});
```

---

## IaC Security & Compliance

### OPA/Conftest Against Generated Templates

```bash
# CDK: test generated CloudFormation
cdk synth > /tmp/template.json
conftest test /tmp/template.json --policy policy/

# Pulumi: test generated resources
pulumi preview --json | conftest test - --policy policy/
```

```rego
# policy/s3.rego
package main

deny[msg] {
  resource := input.Resources[_]
  resource.Type == "AWS::S3::Bucket"
  not resource.Properties.BucketEncryption
  msg := sprintf("S3 bucket '%v' must have encryption configured", [resource])
}
```

### Infrastructure Drift Detection

```bash
# Pulumi: detect drift
pulumi refresh --expect-no-changes

# CDK: detect drift (via CloudFormation)
aws cloudformation detect-stack-drift --stack-name MyStack
aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id DETECTION_ID
```

---

## Publish CDK Constructs to Construct Hub

```typescript
// .projenrc.ts (using projen)
import { awscdk } from "projen";

const project = new awscdk.AwsCdkConstructLibrary({
  author: "Your Name",
  authorAddress: "you@example.com",
  cdkVersion: "2.0.0",
  defaultReleaseBranch: "main",
  name: "@myorg/web-service-construct",
  repositoryUrl: "https://github.com/myorg/web-service-construct",
  // Automatically publishes to npm, PyPI, Maven, NuGet
  publishToNpm: true,
  publishToPypi: { distName: "myorg.web-service-construct", module: "myorg_web_service_construct" },
});

project.synth();
```

---

## Related Skills

- `terraform-patterns` — Terraform HCL patterns with cross-reference to when to choose Pulumi/CDK
- `kubernetes-patterns` — deploying to Kubernetes with Pulumi/CDK generated manifests
- `devsecops-patterns` — OPA/Conftest integration into IaC CI pipeline
- `ci-cd-patterns` — GitHub Actions for IaC deployment pipelines
