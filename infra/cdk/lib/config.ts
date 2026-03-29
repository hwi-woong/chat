import { Construct } from "constructs";

export type InfraConfig = {
  projectName: string;
  envName: string;
  bucketName: string;
  uploadPrefix: string;
  frontendOrigins: string[];
  existingEc2RoleName?: string;
};

type EnvKey =
  | "CDK_PROJECT_NAME"
  | "CDK_ENV_NAME"
  | "CDK_BUCKET_NAME"
  | "CDK_UPLOAD_PREFIX"
  | "CDK_FRONTEND_ORIGINS"
  | "CDK_EXISTING_EC2_ROLE_NAME";

function getEnvString(key: EnvKey) {
  const value = process.env[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

function getContextValue(scope: Construct, key: string) {
  return scope.node.tryGetContext(key);
}

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveString(scope: Construct, options: {
  envKey: EnvKey;
  contextKey: string;
  fallback?: string;
  required?: boolean;
}) {
  const envValue = getEnvString(options.envKey);
  if (envValue) {
    return envValue;
  }

  const contextValue = toTrimmedString(getContextValue(scope, options.contextKey));
  if (contextValue) {
    return contextValue;
  }

  if (options.fallback !== undefined) {
    return options.fallback;
  }

  if (options.required) {
    throw new Error(
      `Missing CDK configuration: set ${options.envKey} or context ${options.contextKey}`
    );
  }

  return "";
}

function normalizeOrigins(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function resolveOrigins(scope: Construct) {
  const envValue = getEnvString("CDK_FRONTEND_ORIGINS");
  if (envValue) {
    return normalizeOrigins(envValue);
  }

  const contextValue = getContextValue(scope, "frontendOrigins");
  const normalized = normalizeOrigins(contextValue);
  if (normalized.length > 0) {
    return normalized;
  }

  return ["http://localhost:3000"];
}

export function loadInfraConfig(scope: Construct): InfraConfig {
  return {
    projectName: resolveString(scope, {
      envKey: "CDK_PROJECT_NAME",
      contextKey: "projectName",
      fallback: "bon"
    }),
    envName: resolveString(scope, {
      envKey: "CDK_ENV_NAME",
      contextKey: "envName",
      fallback: "dev"
    }),
    bucketName: resolveString(scope, {
      envKey: "CDK_BUCKET_NAME",
      contextKey: "bucketName",
      required: true
    }),
    uploadPrefix: resolveString(scope, {
      envKey: "CDK_UPLOAD_PREFIX",
      contextKey: "uploadPrefix",
      fallback: "articles"
    }),
    frontendOrigins: resolveOrigins(scope),
    existingEc2RoleName: resolveString(scope, {
      envKey: "CDK_EXISTING_EC2_ROLE_NAME",
      contextKey: "existingEc2RoleName",
      fallback: ""
    }) || undefined
  };
}
