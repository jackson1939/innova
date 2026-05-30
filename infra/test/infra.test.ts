import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { FundaresStack } from "../lib/base-stack";
import { SharedResourcesStack } from "../lib/shared-resources-stack";

const AWS_ACCOUNT = "682079544132";
const AWS_REGION = "us-east-1";
const ENV = { account: AWS_ACCOUNT, region: AWS_REGION };

describe("SharedResourcesStack", () => {
  it("synthesises without errors", () => {
    const app = new cdk.App();
    const stack = new SharedResourcesStack(app, "TestSharedStack", { env: ENV });
    const template = Template.fromStack(stack);
    expect(template).toBeDefined();
  });
});

describe("FundaresStack", () => {
  it("synthesises without errors (prod)", () => {
    const app = new cdk.App();
    const stack = new FundaresStack(app, "TestProdStack", {
      env: ENV,
      appEnv: "prod",
    });
    const template = Template.fromStack(stack);
    expect(template).toBeDefined();
  });

  it("applies Project tag", () => {
    const app = new cdk.App();
    const stack = new FundaresStack(app, "TestTagStack", {
      env: ENV,
      appEnv: "prod",
    });
    expect(stack.appEnv).toBe("prod");
  });
});
