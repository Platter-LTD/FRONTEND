import { defineConfig, type Options } from "orval"

/**
 * One entry per backend microservice:
 *   specs/<service>.json            → OpenAPI spec (committed; refresh with `npm run gen:update`)
 *   lib/http/<service>-client.ts    → axios instance (base URL, auth headers, 401 refresh)
 *   lib/generated/<service>/        → generated functions + types (gitignored; `npm run gen`)
 *
 * To add a service: add it here, add its spec URL to scripts/update-specs.mjs,
 * and create lib/http/<service>-client.ts.
 */
const SERVICES = {
  "account-ms": "accountMsClient",
  "billing-ms": "billingMsClient",
  "client-auth-ms": "clientAuthMsClient",
  "compliance-ms": "complianceMsClient",
  "create-app-ms": "createAppMsClient",
  "notifications-ms": "notificationsMsClient",
  "payment-ms": "paymentMsClient",
  "product-ms": "productMsClient",
  "service-auth-ms": "serviceAuthMsClient",
  "wallet-ms": "walletMsClient",
} as const

function service(name: string, mutatorName: string): Options {
  return {
    input: {
      target: `./specs/${name}.json`,
    },
    output: {
      mode: "tags-split",
      target: `./lib/generated/${name}/`,
      schemas: `./lib/generated/${name}/model`,
      client: "axios",
      override: {
        mutator: {
          path: `./lib/http/${name}-client.ts`,
          name: mutatorName,
        },
      },
    },
  }
}

export default defineConfig(
  Object.fromEntries(Object.entries(SERVICES).map(([name, mutator]) => [name, service(name, mutator)])),
)
