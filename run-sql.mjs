/**
 * run-sql.mjs <path-to-sql>
 *
 * One-shot helper: posts an arbitrary .sql file to the Supabase Management API.
 * Used for small patches without re-running the full installer.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const sqlArg = process.argv[2];
if (!sqlArg) {
  console.error("Usage: node run-sql.mjs <path-to-sql>");
  process.exit(1);
}

const sqlPath = resolve(__dirname, sqlArg);
if (!existsSync(sqlPath)) {
  console.error(`Not found: ${sqlPath}`);
  process.exit(1);
}

const envPath = resolve(__dirname, ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
}

const PAT = env.SUPABASE_PAT;
const REF = env.SUPABASE_PROJECT_REF;
if (!PAT || !REF) {
  console.error("Missing SUPABASE_PAT or SUPABASE_PROJECT_REF in .env.local");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf-8");
const t0 = Date.now();
const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);
const body = await res.text();
const ms = Date.now() - t0;

if (!res.ok) {
  console.error(`HTTP ${res.status} (${ms}ms)`);
  console.error(body);
  process.exit(1);
}
console.log(`OK (${ms}ms)`);
console.log(body);
