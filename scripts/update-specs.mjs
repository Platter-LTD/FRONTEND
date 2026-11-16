/**
 * Pulls the latest Plata gateway OpenAPI spec into specs/plata.json.
 * Run via: npm run gen:update
 *
 * A spec with `url: null` is skipped and keeps its committed copy.
 */

import { execSync } from "child_process"
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const specsDir = join(__dirname, "..", "specs")

// "Plata Frontend API" spec published by the gateway (its /api-docs.json lists no paths).
const SPECS = [{ name: "plata", url: "https://account-ms-plata.fly.dev/frontendplata/openapi.json" }]

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
