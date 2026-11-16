import { defineConfig } from "orval"

/**
 * One spec for the whole Plata gateway (account-ms-plata routes /api/v1/* to every microservice):
 *   specs/plata.json          → OpenAPI spec (committed)
 *   lib/http/plata-client.ts  → axios instance (gateway base URL, auth headers, 401 refresh)
 *   lib/generated/plata/      → generated React Query hooks, request functions and types (gitignored; `npm run gen`)
 *
 * All API access in the app goes through these hooks (useQuery for reads, useMutation for writes)
 * so responses are cached and shared by React Query.
 */
export default defineConfig({
  plata: {
    input: {
      target: "./specs/plata.json",
      filters: {
        // Only holds /internal/api/v1/wallets/* (service-to-service, X-Internal-Token) — never called from the browser.
        mode: "exclude",
        tags: ["Wallets — Collect"],
      },
    },
    output: {
      mode: "tags-split",
      target: "./lib/generated/plata/",
      schemas: "./lib/generated/plata/model",
      client: "react-query",
      httpClient: "axios",
      override: {
        mutator: {
          path: "./lib/http/plata-client.ts",
          name: "plataClient",
        },
        // Defaults: GET → useQuery, every other verb → useMutation.
        query: {
          signal: true,
        },
      },
    },
  },
})
