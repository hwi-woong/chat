import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const args = {
    file: "",
    stack: "BonInfraStack",
    format: "dotenv"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--file" && next) {
      args.file = next;
      index += 1;
      continue;
    }

    if (current === "--stack" && next) {
      args.stack = next;
      index += 1;
      continue;
    }

    if (current === "--format" && next) {
      args.format = next;
      index += 1;
    }
  }

  if (!args.file) {
    throw new Error("Missing required argument: --file");
  }

  if (args.format !== "dotenv" && args.format !== "github-env") {
    throw new Error("Unsupported format. Use --format dotenv or --format github-env");
  }

  return args;
}

function readOutputs(filePath, stackName) {
  const content = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(content);
  const outputs = parsed?.[stackName];

  if (!outputs || typeof outputs !== "object") {
    throw new Error(`Stack outputs not found: ${stackName}`);
  }

  return outputs;
}

function toEnvMap(outputs) {
  return {
    S3_BUCKET: String(outputs.ArticleImagesBucketName ?? ""),
    S3_REGION: String(outputs.ArticleImagesBucketRegion ?? ""),
    S3_PUBLIC_BASE_URL: String(outputs.ArticleImagesPublicBaseUrl ?? ""),
    S3_UPLOAD_PREFIX: String(outputs.ArticleImagesUploadPrefix ?? "")
  };
}

function validateEnvMap(envMap) {
  const missing = Object.entries(envMap)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required outputs for env export: ${missing.join(", ")}`);
  }
}

function render(envMap) {
  return Object.entries(envMap)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

try {
  const args = parseArgs(process.argv.slice(2));
  const outputs = readOutputs(args.file, args.stack);
  const envMap = toEnvMap(outputs);
  validateEnvMap(envMap);
  process.stdout.write(`${render(envMap)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
