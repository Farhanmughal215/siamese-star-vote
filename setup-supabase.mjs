/**
 * setup-supabase.mjs
 *
 * Runs supabase/install_all.sql against your Supabase project via the
 * Management API. This bypasses the Dashboard's SQL Editor (and its AI
 * suggestions popup) entirely.
 *
 * Run with:
 *   node setup-supabase.mjs
 *
 * Requires two values in .env.local:
 *   SUPABASE_PAT          - Personal Access Token (generate at
 *                           https://supabase.com/dashboard/account/tokens)
 *   SUPABASE_PROJECT_REF  - The "ref" part of your project URL
 *                           (e.g., if your URL is https://abcdefgh.supabase.co
 *                            then the ref is "abcdefgh")
 *
 * No npm install needed - uses only built-in Node modules.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- Pretty terminal output ----------
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
const log = (msg) => console.log(msg);
const ok = (msg) => log(`${c.green}✓${c.reset}  ${msg}`);
const fail = (msg) => log(`${c.red}✗${c.reset}  ${msg}`);
const info = (msg) => log(`${c.cyan}›${c.reset}  ${msg}`);

// ---------- Read .env.local ----------
const envPath = resolve(__dirname, ".env.local");
if (!existsSync(envPath)) {
  fail(".env.local not found at project root");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed
    .slice(eq + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const PAT = env.SUPABASE_PAT;
const REF = env.SUPABASE_PROJECT_REF;

if (!PAT || !REF) {
  fail("Missing SUPABASE_PAT or SUPABASE_PROJECT_REF in .env.local");
  log("");
  log("Add these two lines to your .env.local file:");
  log(`  ${c.dim}SUPABASE_PAT=sbp_xxxxxxxxxx${c.reset}`);
  log(`  ${c.dim}SUPABASE_PROJECT_REF=abcdefghijklmnop${c.reset}`);
  log("");
  log(
    "Generate a PAT at: https://supabase.com/dashboard/account/tokens",
  );
  log("Your project ref is the subdomain of your project URL.");
  process.exit(1);
}

ok(`Loaded credentials for project: ${c.bold}${REF}${c.reset}`);

// ---------- Read install_all.sql ----------
const sqlPath = resolve(__dirname, "supabase/install_all.sql");
if (!existsSync(sqlPath)) {
  fail("supabase/install_all.sql not found");
  process.exit(1);
}

let sql = readFileSync(sqlPath, "utf-8");

// Append the Phase 4 auth migration if it exists. Idempotent SQL.
const authMigrationPath = resolve(__dirname, "supabase/auth_migration.sql");
if (existsSync(authMigrationPath)) {
  sql += "\n\n" + readFileSync(authMigrationPath, "utf-8");
}
const lineCount = sql.split("\n").length;
const charCount = sql.length;
ok(
  `Loaded SQL: ${c.bold}${lineCount}${c.reset} lines, ${c.bold}${charCount}${c.reset} chars`,
);

// ---------- Run the SQL ----------
info("Sending to Supabase Management API...");
const startTime = Date.now();

const apiUrl = `https://api.supabase.com/v1/projects/${REF}/database/query`;

let response;
try {
  response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
} catch (err) {
  fail(`Network error: ${err.message}`);
  process.exit(1);
}

const elapsedMs = Date.now() - startTime;
let body;
try {
  body = await response.json();
} catch {
  body = await response.text();
}

if (!response.ok) {
  fail(
    `HTTP ${response.status} ${response.statusText} (${elapsedMs}ms)`,
  );
  log("");
  log(`${c.red}Response body:${c.reset}`);
  log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  log("");
  if (response.status === 401) {
    log(`${c.yellow}Hint:${c.reset} 401 usually means your SUPABASE_PAT is wrong or expired.`);
  } else if (response.status === 404) {
    log(`${c.yellow}Hint:${c.reset} 404 usually means SUPABASE_PROJECT_REF doesn't match a real project.`);
  }
  process.exit(1);
}

ok(`SQL executed successfully in ${c.bold}${elapsedMs}ms${c.reset}`);

// ---------- Verify ----------
info("Verifying tables...");

async function runQuery(q) {
  const r = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: q }),
  });
  return r.ok ? r.json() : null;
}

const catsResult = await runQuery("select count(*)::int as n from public.cats");
const settingsResult = await runQuery(
  "select count(*)::int as n from public.app_settings",
);
const codesResult = await runQuery(
  "select count(*)::int as n from public.invitation_codes",
);

const catsN = catsResult?.[0]?.n;
const settingsN = settingsResult?.[0]?.n;
const codesN = codesResult?.[0]?.n;

log("");
log(`  ${c.bold}cats${c.reset} table:             ${catsN === 16 ? c.green : c.red}${catsN}${c.reset} rows ${catsN === 16 ? "(expected 16)" : "(expected 16!)"}`);
log(`  ${c.bold}invitation_codes${c.reset} table:  ${codesN === 4 ? c.green : c.red}${codesN}${c.reset} rows ${codesN === 4 ? "(expected 4)" : "(expected 4!)"}`);
log(`  ${c.bold}app_settings${c.reset} table:      ${settingsN === 3 ? c.green : c.red}${settingsN}${c.reset} rows ${settingsN === 3 ? "(expected 3)" : "(expected 3!)"}`);
log("");

if (catsN === 16 && settingsN === 3 && codesN === 4) {
  ok(`${c.bold}${c.green}Database is fully set up.${c.reset}`);
  log("");
  log("Next steps:");
  log("  1. Restart your dev server (Ctrl+C, then `npm run dev`)");
  log("  2. Hard-refresh the browser (Ctrl+Shift+R)");
  log("  3. Clear localStorage if you want a fresh test");
  log("  4. Vote for a cat -> rows appear in Supabase!");
} else {
  fail("Verification failed - seed data didn't land. Check Supabase Table Editor.");
  process.exit(1);
}
