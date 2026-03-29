import * as cdk from "aws-cdk-lib";
import { aws_iam as iam, aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { loadInfraConfig } from "./config";

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = loadInfraConfig(this);
    const articleImagesPrefix = [config.uploadPrefix, "images"]
      .map((value) => value.trim().replace(/^\/+|\/+$/g, ""))
      .filter(Boolean)
      .join("/");

    const bucket = new s3.Bucket(this, "ArticleImagesBucket", {
      bucketName: config.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: config.frontendOrigins,
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 300
        }
      ],
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false
      })
    });

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowPublicReadForArticleImages",
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects(`${articleImagesPrefix}/*`)]
      })
    );

    const articleImagesAccessPolicy = new iam.ManagedPolicy(this, "ArticleImagesAccessPolicy", {
      managedPolicyName: `${config.projectName}-${config.envName}-article-images-access`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:ListBucket"],
          resources: [bucket.bucketArn],
          conditions: {
            StringLike: {
              "s3:prefix": [`${articleImagesPrefix}/*`]
            }
          }
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetObject", "s3:PutObject"],
          resources: [bucket.arnForObjects(`${articleImagesPrefix}/*`)]
        })
      ]
    });

    if (config.existingEc2RoleName) {
      const existingRole = iam.Role.fromRoleName(
        this,
        "ExistingBackendRole",
        config.existingEc2RoleName
      );
      articleImagesAccessPolicy.attachToRole(existingRole);
    }

    new cdk.CfnOutput(this, "ArticleImagesBucketName", {
      value: bucket.bucketName
    });

    new cdk.CfnOutput(this, "ArticleImagesBucketRegion", {
      value: this.region
    });

    new cdk.CfnOutput(this, "ArticleImagesPublicBaseUrl", {
      value: `https://${bucket.bucketName}.s3.${this.region}.amazonaws.com`
    });

    new cdk.CfnOutput(this, "ArticleImagesAccessPolicyArn", {
      value: articleImagesAccessPolicy.managedPolicyArn
    });

    new cdk.CfnOutput(this, "ArticleImagesUploadPrefix", {
      value: config.uploadPrefix
    });

    if (config.existingEc2RoleName) {
      new cdk.CfnOutput(this, "AttachedEc2RoleName", {
        value: config.existingEc2RoleName
      });
    }
  }
}
