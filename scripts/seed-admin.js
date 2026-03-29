const path = require("path");
const bcrypt = require("bcrypt");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", "apps", "backend", ".env"), quiet: true });
require("dotenv").config({ quiet: true });

const HELP_TEXT = `
Usage:
  npm run db:seed:admin -- --password <password> [--username <username>] [--display-name <name>]

Options:
  --username <value>        관리자 아이디 (default: admin or ADMIN_USERNAME)
  --display-name <value>    관리자 표시 이름 (default: 관리자 or ADMIN_DISPLAY_NAME)
  --password <value>        관리자 비밀번호
  --help                    도움말 출력
`.trim();

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help") {
      args.help = true;
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unknown argument: ${token}`);
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];
    const expectsValue = rawKey === "username" || rawKey === "display-name" || rawKey === "password";

    if (!expectsValue) {
      throw new Error(`Unknown option: --${rawKey}`);
    }

    if (!inlineValue) {
      if (!nextValue || nextValue.startsWith("--")) {
        throw new Error(`Missing value for --${rawKey}`);
      }
      index += 1;
    }

    args[rawKey] = nextValue;
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const username = args.username || process.env.ADMIN_USERNAME || "admin";
  const displayName = args["display-name"] || process.env.ADMIN_DISPLAY_NAME || "관리자";
  const password = args.password || process.env.ADMIN_PASSWORD;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!password) {
    throw new Error("관리자 비밀번호가 필요합니다. --password 또는 ADMIN_PASSWORD를 설정하세요.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query(
      `
      INSERT INTO admins (username, display_name, password_hash, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (username)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        password_hash = EXCLUDED.password_hash,
        is_active = true,
        updated_at = now()
      `,
      [username, displayName, passwordHash]
    );

    console.log(`Admin upserted: ${username}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Admin seed failed:", error);
  console.error("");
  console.error(HELP_TEXT);
  process.exitCode = 1;
});
