import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FundaresStackProps extends cdk.StackProps {
  /**
   * Application environment: "dev" | "prod".
   * Named `appEnv` (not `environment`) to avoid shadowing the built-in
   * `cdk.Stack.environment` property (which holds aws://account/region).
   */
  appEnv: string;

  /**
   * Logical service name used for all resource names.
   * Defaults to `fundares-{appEnv}`.
   */
  serviceName?: string;

  /**
   * CloudWatch log-retention in days for the API Gateway access log group.
   * Must be one of the valid values accepted by `logs.RetentionDays`.
   * Defaults to ONE_WEEK (7 days).
   */
  apiGwLogRetentionDays?: logs.RetentionDays;

  /**
   * Extra (non-sensitive) environment variables injected into the Lambda.
   * Sensitive values are stored in AWS Secrets Manager
   * and fetched by the Lambda at cold start via APP_SECRET_ARN.
   */
  lambdaEnvironmentVariables?: Record<string, string>;
}

// ─── Stack ────────────────────────────────────────────────────────────────────

export class FundaresStack extends cdk.Stack {
  /** Application environment ("dev" | "prod"). */
  public readonly appEnv: string;
  /** The HTTP API (ApiGatewayV2). */
  public readonly httpApi: apigatewayv2.CfnApi;
  /** The Lambda function that handles all routes. */
  public readonly lambdaFn: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: FundaresStackProps) {
    super(scope, id, props);

    this.appEnv = props.appEnv;

    const projectName = "fundares";
    const serviceName = props.serviceName ?? `${projectName}-${this.appEnv}`;
    const apiGwLogRetention = props.apiGwLogRetentionDays ?? logs.RetentionDays.ONE_WEEK;
    const isProd = this.appEnv === "prod";

    // ─── Stack-level tags ────────────────────────────────────────────────────
    cdk.Tags.of(this).add("Project", projectName);
    cdk.Tags.of(this).add("Environment", this.appEnv);
    cdk.Tags.of(this).add("ManagedBy", "CDK");

    // ─────────────────────────────────────────────────────────────────────────
    // IAM  –  Lambda execution role
    // ─────────────────────────────────────────────────────────────────────────
    const lambdaRole = new iam.Role(this, "LambdaExecRole", {
      roleName: `${serviceName}-lambda-exec-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CloudWatch log group  –  Lambda logs
    // ─────────────────────────────────────────────────────────────────────────
    const lambdaLogGroup = new logs.LogGroup(this, "LambdaLogGroup", {
      logGroupName: `/aws/lambda/${serviceName}-function`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // AWS Secrets Manager — app configuration secret
    //
    // Secret name convention: fundares/{env}/app
    // Keys: CORS_ORIGINS, LOG_LEVEL
    // ─────────────────────────────────────────────────────────────────────────
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this, "AppSecret", `fundares/${this.appEnv}/app`
    );

    appSecret.grantRead(lambdaRole);

    // ─────────────────────────────────────────────────────────────────────────
    // S3 bucket  —  temporary ID document storage for age verification
    // ─────────────────────────────────────────────────────────────────────────
    const verificationBucket = new s3.Bucket(this, "VerificationBucket", {
      bucketName: `${serviceName}-verification`,
      lifecycleRules: [
        {
          id: "expire-sessions",
          prefix: "sessions/",
          expiration: cdk.Duration.days(2),
          enabled: true,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    verificationBucket.grantReadWrite(lambdaRole);

    // ─────────────────────────────────────────────────────────────────────────
    // Bedrock  —  allow Lambda to invoke Claude / Nova for document analysis
    // ─────────────────────────────────────────────────────────────────────────
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowBedrockInvokeModel",
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:*:${this.account}:inference-profile/us.anthropic.claude-haiku-4*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/us.anthropic.claude-sonnet-4*`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4*`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4*`,
          `arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0`,
          `arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0`,
        ],
      }),
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowBedrockMarketplaceSubscription",
        actions: [
          "aws-marketplace:ViewSubscriptions",
          "aws-marketplace:Subscribe",
          "aws-marketplace:Unsubscribe",
        ],
        resources: ["*"],
      }),
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Lambda function
    // ─────────────────────────────────────────────────────────────────────────
    this.lambdaFn = new lambdaNodejs.NodejsFunction(this, "AppFunction", {
      functionName: `${serviceName}-function`,
      description: "Fundares identification service",
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../../apps/identification/src/index.ts"),
      handler: "handler",
      role: lambdaRole,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        NODE_ENV: isProd ? "production" : "development",
        CORS_ORIGINS: appSecret.secretValueFromJson("CORS_ORIGINS").unsafeUnwrap(),
        LOG_LEVEL:    appSecret.secretValueFromJson("LOG_LEVEL").unsafeUnwrap(),
        S3_VERIFICATION_BUCKET: verificationBucket.bucketName,
        BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0",
        CONFIDENCE_THRESHOLD: "0.85",
        ...props.lambdaEnvironmentVariables,
      },
      logGroup: lambdaLogGroup,
      bundling: {
        minify: isProd,
        sourceMap: !isProd,
        target: "node22",
        externalModules: ["aws-sdk", "@aws-sdk/*"],
        define: {
          "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
        },
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // HTTP API  (ApiGatewayV2)
    // ─────────────────────────────────────────────────────────────────────────
    this.httpApi = new apigatewayv2.CfnApi(this, "HttpApi", {
      name: serviceName,
      protocolType: "HTTP",
      description: "Serverless API",
      corsConfiguration: {
        allowCredentials: false,
        allowHeaders: ["*"],
        allowMethods: ["GET", "HEAD", "OPTIONS", "POST", "PATCH", "PUT", "DELETE"],
        allowOrigins: ["*"],
        exposeHeaders: ["*"],
        maxAge: 300,
      },
      tags: {
        Project: projectName,
        Environment: this.appEnv,
        ManagedBy: "CDK",
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CloudWatch log group  –  API Gateway access logs
    // ─────────────────────────────────────────────────────────────────────────
    const apiGwLogGroup = new logs.LogGroup(this, "ApiGwLogGroup", {
      logGroupName: `/aws/api_gw/${serviceName}-api`,
      retention: apiGwLogRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // API Gateway stage  –  $default (auto-deploy)
    // ─────────────────────────────────────────────────────────────────────────
    new apigatewayv2.CfnStage(this, "DefaultStage", {
      apiId: this.httpApi.ref,
      stageName: "$default",
      autoDeploy: true,
      accessLogSettings: {
        destinationArn: apiGwLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          sourceIp: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          protocol: "$context.protocol",
          httpMethod: "$context.httpMethod",
          resourcePath: "$context.resourcePath",
          routeKey: "$context.routeKey",
          status: "$context.status",
          responseLength: "$context.responseLength",
          integrationErrorMessage: "$context.integrationErrorMessage",
        }),
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Lambda integration  (AWS_PROXY, payload format 2.0)
    // ─────────────────────────────────────────────────────────────────────────
    const lambdaInvokeArn = `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.lambdaFn.functionArn}/invocations`;

    const integration = new apigatewayv2.CfnIntegration(this, "LambdaIntegration", {
      apiId: this.httpApi.ref,
      integrationType: "AWS_PROXY",
      integrationUri: lambdaInvokeArn,
      integrationMethod: "POST",
      payloadFormatVersion: "2.0",
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Routes  –  ANY / and ANY /{proxy+}
    // ─────────────────────────────────────────────────────────────────────────
    new apigatewayv2.CfnRoute(this, "RootRoute", {
      apiId: this.httpApi.ref,
      routeKey: "ANY /",
      target: `integrations/${integration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, "ProxyRoute", {
      apiId: this.httpApi.ref,
      routeKey: "ANY /{proxy+}",
      target: `integrations/${integration.ref}`,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Lambda resource policy  –  allow API GW to invoke
    // ─────────────────────────────────────────────────────────────────────────
    const executionArn = `arn:aws:execute-api:${this.region}:${this.account}:${this.httpApi.ref}`;

    new lambda.CfnPermission(this, "ApiGwInvokeLambda", {
      action: "lambda:InvokeFunction",
      functionName: this.lambdaFn.functionArn,
      principal: "apigateway.amazonaws.com",
      sourceArn: `${executionArn}/*/*`,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Stack outputs
    // ─────────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: `https://${this.httpApi.ref}.execute-api.${this.region}.amazonaws.com`,
      description: "HTTP API endpoint URL",
      exportName: `${serviceName}-api-endpoint`,
    });

    new cdk.CfnOutput(this, "LambdaFunctionName", {
      value: this.lambdaFn.functionName,
      description: "Lambda function name",
      exportName: `${serviceName}-lambda-name`,
    });

    new cdk.CfnOutput(this, "LambdaFunctionArn", {
      value: this.lambdaFn.functionArn,
      description: "Lambda function ARN",
      exportName: `${serviceName}-lambda-arn`,
    });

    new cdk.CfnOutput(this, "AppSecretArn", {
      value: appSecret.secretArn,
      description: "Secrets Manager secret ARN (externally managed — populated by CI/CD before deploy)",
      exportName: `${serviceName}-secret-arn`,
    });

    new cdk.CfnOutput(this, "AppSecretBootstrapCommand", {
      value: [
        `aws secretsmanager create-secret`,
        `--name fundares/${this.appEnv}/app`,
        `--secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"${isProd ? "info" : "debug"}"}'`,
      ].join(" \\\n  "),
      description: "One-time CLI command to create the secret before first CDK deploy",
    });
  }
}
