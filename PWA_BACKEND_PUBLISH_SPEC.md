# PWA Publish Contract (Frontend -> Backend)

## Purpose

This document defines the backend changes required to make App Builder publish a fully working Progressive Web App (PWA) with predictable behavior and seamless frontend integration.

The frontend already:
- Creates/updates PWA templates via `config` sections.
- Uploads logo/splash/onboarding images.
- Marks one template as applied (`isApplied`) on publish.

What is still needed is a **runtime publish artifact contract** (manifest + service worker + publish status) so installability and offline behavior are guaranteed.

---

## Current Frontend Behavior (Already Implemented)

### 1) Template persistence (Create App MS)

Frontend uses these routes (proxied through Next API):
- `GET /api/apps/:appId/configuration/templates` -> upstream `GET /api/v1/apps/:appId/pwa-templates`
- `POST /api/apps/:appId/configuration/templates` -> upstream `POST /api/v1/apps/:appId/pwa-templates`
- `GET /api/apps/:appId/configuration/templates/:templateId` -> upstream `GET /api/v1/apps/:appId/pwa-templates/:templateId`
- `PUT /api/apps/:appId/configuration/templates/:templateId` -> upstream `PUT /api/v1/apps/:appId/pwa-templates/:templateId`
- `DELETE /api/apps/:appId/configuration/templates/:templateId` -> upstream `DELETE /api/v1/apps/:appId/pwa-templates/:templateId`
- `POST /api/apps/:appId/configuration/templates/:templateId/apply` -> upstream `PATCH /api/v1/apps/:appId/pwa-templates/:templateId/apply`

### 2) Asset uploads (already wired)

- `POST /api/apps/:appId/pwa-templates/:templateId/assets/logo`
- `POST /api/apps/:appId/pwa-templates/:templateId/assets/splash`
- `POST /api/apps/:appId/pwa-templates/:templateId/onboarding/screens/:screenIndex/image`

Field name: `file` (multipart/form-data).

### 3) Config shape sent by frontend

Frontend maps App Builder state to template `config` in this exact sectioned shape:
- `asset`
- `splash`
- `onboarding`
- `appProfile`
- `policyTerms`
- `support`
- `dns`

Notes:
- `onboarding.screens[]` is used (0-based).
- `appProfile.fontFamily` is included.
- Colors are sent as hex strings.
- `dns.defaultAppUrl` and `dns.customDomain*` fields are sent when provided.

### 4) Upstream base URL

All frontend API proxies use the same backend base from:
- `NEXT_PUBLIC_API_URL` (via shared helper `getApiUpstreamBase()`).

---

## Required Backend Additions

## A) Publish Endpoint

### `POST /api/v1/apps/:appId/pwa/publish`

Publishes a PWA build artifact from either:
1. `templateId` in request body, or
2. currently applied template for the app.

### Request

```json
{
  "templateId": "optional-string",
  "publishMode": "apply-and-publish"
}
```

`publishMode` can be optional; default behavior should be:
- If `templateId` present: mark it applied, then publish.
- Else publish currently applied template.

### Success Response (contract)

```json
{
  "success": true,
  "message": "PWA published successfully",
  "data": {
    "publishId": "pwa_pub_123",
    "appId": "app_123",
    "templateId": "tpl_456",
    "version": "2026-04-07T10:33:12.121Z",
    "manifestUrl": "https://<host>/api/v1/apps/app_123/pwa/manifest.webmanifest",
    "serviceWorkerUrl": "https://<host>/api/v1/apps/app_123/pwa/sw.js",
    "pwaEntryUrl": "https://my-app.springtd.com/",
    "publishedAt": "2026-04-07T10:33:12.121Z"
  }
}
```

---

## B) Publish Status Endpoint

### `GET /api/v1/apps/:appId/pwa/status`

Returns whether app is publish-ready and/or published.

### Success Response

```json
{
  "success": true,
  "data": {
    "isPublished": true,
    "appId": "app_123",
    "templateId": "tpl_456",
    "version": "2026-04-07T10:33:12.121Z",
    "manifestReady": true,
    "serviceWorkerReady": true,
    "iconsReady": true,
    "httpsReady": true,
    "customDomainReady": false,
    "warnings": [],
    "errors": []
  }
}
```

---

## C) Runtime Artifact Endpoints

### `GET /api/v1/apps/:appId/pwa/manifest.webmanifest`

Returns generated manifest JSON (not template config).

Minimum required keys:
- `name`
- `short_name`
- `start_url`
- `scope`
- `display` (`standalone`)
- `theme_color`
- `background_color`
- `icons` (must include 192 and 512)

### `GET /api/v1/apps/:appId/pwa/sw.js`

Returns versioned service worker script for the app.

Recommended headers:
- `Content-Type: application/javascript`
- cache headers suitable for SW versioning strategy.

---

## Mapping Rules (Template Config -> Runtime Manifest)

Use deterministic mapping so frontend and backend stay aligned.

- `config.asset.siteDescription` -> `manifest.description`
- `config.splash.primaryColor` -> `manifest.theme_color`
- `config.splash.secondaryColor` -> `manifest.background_color`
- `config.asset.logoUrl` and/or generated resized icons -> `manifest.icons[]`
- `app.name` -> `manifest.name`
- `app.alias` or truncated name -> `manifest.short_name`
- `config.dns.defaultAppUrl` or validated custom domain -> `start_url`, `scope`, `pwaEntryUrl`

If a field is missing:
- Apply safe defaults, but also report warnings in `pwa/status`.

---

## Validation Rules Required Before Publish

Reject publish with `422` if any critical requirement fails:
- No template resolved (`templateId` missing and no applied template).
- Missing icon source (`asset.logoUrl`) and no generated fallback icons.
- Invalid `splash` color format.
- App has no valid URL base for `start_url`/`scope`.
- Domain not HTTPS in production.

### Error Response (uniform)

```json
{
  "success": false,
  "error": "PWA publish validation failed",
  "details": [
    "logoUrl is required",
    "primaryColor must be a valid hex color"
  ]
}
```

Use this same envelope for 4xx/5xx errors across PWA endpoints.

---

## Backend Storage Recommendation

Store publish output separately from editable template config.

Suggested model: `AppPwaPublish`
- `id`
- `appId`
- `templateId`
- `version`
- `manifest` (resolved runtime manifest)
- `serviceWorkerMeta` (hash/version/path)
- `artifactUrls` (`manifestUrl`, `serviceWorkerUrl`, `pwaEntryUrl`)
- `status` (`published`, `failed`, `pending`)
- `warnings`, `errors`
- `publishedAt`, `updatedAt`

Why separate storage:
- Keeps draft template edits independent from deployed runtime state.
- Supports rollback/version history.
- Makes status checks fast and deterministic.

---

## Why This Will Integrate Seamlessly

1. **Contract matches existing frontend flow**
   - Frontend already reads/writes template `config` and calls apply.
   - Publish endpoint simply extends that flow instead of replacing it.

2. **No breaking changes to current template APIs**
   - Existing `pwa-templates` CRUD remains as source-of-truth editor data.
   - New endpoints only add runtime publishing concerns.

3. **Deterministic mapping**
   - Frontend and backend use the same section names (`asset`, `splash`, etc.).
   - Reduces field mismatch and ambiguous interpretation.

4. **Operational visibility**
   - `pwa/status` gives a machine-readable readiness checklist.
   - Frontend can show exact blockers and avoid blind publish failures.

5. **Production-safe rollout**
   - Validation + explicit error details prevent broken manifests.
   - Runtime artifacts are versionable and can be rolled back.

6. **Separation of concerns**
   - Template editing (UI concern) and runtime PWA artifact generation (deployment concern) are decoupled.

---

## Suggested Rollout Plan (Backend)

1. Implement `POST /pwa/publish` with hardcoded manifest defaults.
2. Implement `GET /pwa/status` and return readiness flags.
3. Implement `GET /pwa/manifest.webmanifest` and `GET /pwa/sw.js`.
4. Add strict validation + detailed `details[]`.
5. Add versioning + rollback metadata.

---

## Frontend Integration After Backend Is Ready

Once these endpoints are live, frontend will:
- Call `POST /pwa/publish` from Publish tab.
- Poll/read `GET /pwa/status`.
- Display publish health and runtime URLs.
- Keep existing template editing and apply behavior unchanged.

