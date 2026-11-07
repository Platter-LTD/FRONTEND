/**
 * Pulls the latest OpenAPI spec from each microservice into specs/<name>.json.
 * Run via: npm run gen:update            (all services)
 *          npm run gen:update -- wallet-ms product-ms   (only these)
 *
 * Each `url` must point at the service's own OpenAPI JSON (not the gateway's
 * /api-docs.json, which lists no paths). Services with `url: null` are skipped
 * and keep their committed spec until the URL is filled in.
 */

import { execSync } from "child_process"
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const specsDir = join(__dirname, "..", "specs")

// TODO: fill in each service's OpenAPI JSON URL.
const SPECS = [
  { name: "account-ms", url: null },
  { name: "billing-ms", url: null },
  { name: "client-auth-ms", url: null },
  { name: "compliance-ms", url: null },
  { name: "create-app-ms", url: null },
  { name: "notifications-ms", url: null },
  { name: "payment-ms", url: null },
  { name: "product-ms", url: null },
  { name: "service-auth-ms", url: null },
  { name: "wallet-ms", url: null },
]

const requested = new Set(process.argv.slice(2))
const unknown = [...requested].filter((name) => !SPECS.some((spec) => spec.name === name))
if (unknown.length > 0) {
  console.error(`Unknown spec name(s): ${unknown.join(", ")}`)
  console.error(`Available specs: ${SPECS.map(({ name }) => name).join(", ")}`)
  process.exit(1)
}
const selected = requested.size === 0 ? SPECS : SPECS.filter(({ name }) => requested.has(name))

mkdirSync(specsDir, { recursive: true })

let failed = false

for (const { name, url } of selected) {
  if (!url) {
    console.log(`Skipping ${name} — no spec URL configured`)
    continue
  }
  const outPath = join(specsDir, `${name}.json`)
  process.stdout.write(`Fetching ${name} spec ... `)
  try {
    execSync(`curl -sf -o "${outPath}" "${url}"`, { stdio: "pipe" })
    // Re-indent so spec diffs stay reviewable.
    writeFileSync(outPath, `${JSON.stringify(JSON.parse(readFileSync(outPath, "utf-8")), null, 2)}\n`)
    console.log("done")
  } catch {
    console.error(`FAILED — could not fetch ${url}`)
    failed = true
  }
}

if (failed) {
  console.error("\nOne or more specs failed to update. Aborting generation.")
  process.exit(1)
}
