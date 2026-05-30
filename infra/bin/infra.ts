#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { FundaresStack } from "../lib/base-stack";
import { SharedResourcesStack } from "../lib/shared-resources-stack";
import { CostOptimizationAspect, SecurityValidationAspect } from "../lib/validation-aspects";

const app = new cdk.App();

const AWS_ACCOUNT =
  process.env.AWS_ACCOUNT_ID ??
  process.env.CDK_DEFAULT_ACCOUNT ??
  (() => { throw new Error("AWS account not resolved — set AWS_ACCOUNT_ID or configure AWS credentials."); })();
const AWS_REGION = process.env.CDK_DEFAULT_REGION ?? "us-east-1";

// ─── Shared resources (deployed once, region-wide) ────────────────────────────
new SharedResourcesStack(app, "FundaresSharedStack", {
  env: { account: AWS_ACCOUNT, region: AWS_REGION },
  description: "Shared resources for the Fundares platform",
});

// ─── Environment-specific stack ───────────────────────────────────────────────
const stack = new FundaresStack(app, "FundaresStack-Prod", {
  env: { account: AWS_ACCOUNT, region: AWS_REGION },
  appEnv: "prod",
  description: "Fundares platform — prod environment",
});

// ─── Validation aspects ───────────────────────────────────────────────────────
cdk.Aspects.of(stack).add(new SecurityValidationAspect("prod"));
cdk.Aspects.of(stack).add(new CostOptimizationAspect("prod"));
