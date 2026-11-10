import { defineConfig } from "orval"

/**
 * One spec for the whole Plata gateway (account-ms-plata routes /api/v1/* to every microservice):
 *   specs/plata.json          → OpenAPI spec (committed)
 *   lib/http/plata-client.ts  → axios instance (gateway base URL, auth headers, 401 refresh)
 *   lib/generated/plata/      → generated functions + types (gitignored; `npm run gen`)
 */
export default defineConfig({
  plata: {
    input: {
      target: "./specs/plata.json",
    },
    output: {
      mode: "tags-split",
      target: "./lib/generated/plata/",
      schemas: "./lib/generated/plata/model",
      client: "axios",
      override: {
        mutator: {
          path: "./lib/http/plata-client.ts",
          name: "plataClient",
        },
      },
    },
  },
})
