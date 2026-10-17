# Dependency risk assessment

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Command | `npm audit --json` after `npm ci` |
| Node | v22.23.3 |
| npm | 10.9.9 |
| Result | 11 findings: 0 critical, 1 moderate, 10 high |
| Not done | `npm audit fix --force` was not run. Next.js was not moved to 16.x. Prisma was not upgraded or downgraded. |

The audit counts a package once and also counts the packages that pull it in. The distinct advisories are the seven GitHub Security Advisories below.

## Risk decision

PostCSS, as bundled by Next.js 15.5.27, is a production package with high advisories and no patch inside the Next.js 15 line that this application can take without a major upgrade. That is an accepted known risk for this staging-preparation change. It does not make the staging environment ready. Staging remains blocked because the staging services are not configured. See `Documentation/Stage_10_1_Staging_Enablement_Report.md`.

## Advisories

### postcss — GHSA-qx2v-qp2m-jg93

| Item | Record |
| --- | --- |
| Package | `postcss` 8.4.31 at `node_modules/next/node_modules/postcss` |
| Advisory | XSS via unescaped `</style>` in CSS stringify output |
| Severity | Moderate (npm groups the package as high because of the other PostCSS advisories) |
| Dependency | Production, nested under `next` 15.5.27 |
| Reachable path | Next.js CSS compiler at build time. The application does not expose a CSS parser to visitors. |
| Patched version | 8.5.10 |
| Upgrade requirement | npm offers `next@16.4.2`, a new major version |
| Regression risk | A Next.js 16 upgrade changes the framework, the build, and the Auth.js integration |
| Disposition | Not upgraded. Accepted known risk until a Next.js 15 release vendors PostCSS 8.5.23 or newer |

### postcss — GHSA-6g55-p6wh-862q

| Item | Record |
| --- | --- |
| Package | `postcss` 8.4.31 |
| Advisory | Arbitrary file read through an attacker-controlled `sourceMappingURL` in a CSS comment |
| Severity | High |
| Dependency | Production, nested under `next` |
| Reachable path | Build-time CSS compilation of first-party stylesheets. Not a public request handler. |
| Patched version | 8.5.12 |
| Upgrade requirement | `next@16.4.2` |
| Regression risk | Major framework upgrade |
| Disposition | Not upgraded. Accepted known risk, same decision as above |

### postcss — GHSA-fxqj-rqcc-2cmp

| Item | Record |
| --- | --- |
| Package | `postcss` 8.4.31 |
| Advisory | Incomplete fix of GHSA-6g55-p6wh-862q when `from` is unset; a `sourceMappingURL` can still read a `.map` file |
| Severity | Moderate |
| Dependency | Production, nested under `next` |
| Reachable path | Build-time CSS compilation |
| Patched version | 8.5.23 |
| Upgrade requirement | `next@16.4.2` |
| Regression risk | Major framework upgrade |
| Disposition | Not upgraded. Accepted known risk |

### postcss — GHSA-r28c-9q8g-f849

| Item | Record |
| --- | --- |
| Package | `postcss` 8.4.31 |
| Advisory | Path traversal while auto-loading a previous source map |
| Severity | High |
| Dependency | Production, nested under `next` |
| Reachable path | Build-time CSS compilation |
| Patched version | 8.5.18 |
| Upgrade requirement | `next@16.4.2` |
| Regression risk | Major framework upgrade |
| Disposition | Not upgraded. Accepted known risk |

### next

| Item | Record |
| --- | --- |
| Package | `next` 15.5.27 |
| Advisory | The moderate finding is the PostCSS advisory above, reported through the Next.js package |
| Severity | Moderate |
| Dependency | Production, direct |
| Reachable path | Same build-time CSS compiler |
| Patched version | The audit's fix is `next@16.4.2` |
| Upgrade requirement | New major version |
| Regression risk | Major framework upgrade |
| Disposition | Not upgraded |

### braces — GHSA-vfj7-8cjw-p6xm

| Item | Record |
| --- | --- |
| Package | `braces` 3.0.3 |
| Advisory | Stack exhaustion from a deeply nested pattern |
| Severity | High |
| Dependency | Development. Path: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` |
| Reachable path | ESLint only. Not imported by the application server |
| Patched version | GitHub lists no patched release. The vulnerable range is `<= 3.0.3` |
| Upgrade requirement | npm offers `eslint-config-next@14.2.35`, which is an older major line |
| Regression risk | Downgrading the Next.js ESLint config would drop the 15.x lint rules |
| Disposition | Not changed |

### fast-glob, micromatch, @next/eslint-plugin-next, eslint-config-next

| Item | Record |
| --- | --- |
| Package | `fast-glob`, `micromatch`, `@next/eslint-plugin-next`, `eslint-config-next` 15.5.27 |
| Advisory | The same braces advisory, reported on each package in the lint chain |
| Severity | High |
| Dependency | Development. `eslint-config-next` is a direct devDependency |
| Reachable path | `npm run lint` only |
| Patched version | No patched `braces` release. The suggested parent is `eslint-config-next@14.2.35` |
| Upgrade requirement | Downgrade |
| Regression risk | Loss of the Next.js 15 lint rules |
| Disposition | Not changed |

### deepmerge-ts — GHSA-ggr8-5vv4-36mx

| Item | Record |
| --- | --- |
| Package | `deepmerge-ts` 7.1.5 |
| Advisory | Stack exhaustion when merging a recursive object graph |
| Severity | High |
| Dependency | Development. Path: `prisma` CLI → `@prisma/config` → `deepmerge-ts` |
| Reachable path | Prisma CLI configuration. Not the `@prisma/client` query engine used at runtime |
| Patched version | 8.0.0 |
| Upgrade requirement | npm offers `prisma@7.10.1`, a new major version |
| Regression risk | Prisma 7 changes the client and the migration toolchain |
| Disposition | Not upgraded |

### effect — GHSA-38f7-945m-qr2g

| Item | Record |
| --- | --- |
| Package | `effect` 3.16.12 |
| Advisory | `AsyncLocalStorage` context can be lost or mixed across Effect fibers |
| Severity | High |
| Dependency | Development, through `@prisma/config` |
| Reachable path | Prisma CLI. The application does not import `effect` |
| Patched version | 3.20.0 |
| Upgrade requirement | `prisma@7.10.1` |
| Regression risk | Prisma 7 major upgrade |
| Disposition | Not upgraded |

### prisma and @prisma/config

| Item | Record |
| --- | --- |
| Package | `prisma` 6.16.2 and `@prisma/config` |
| Advisory | The deepmerge-ts and effect advisories, reported on the CLI packages |
| Severity | High |
| Dependency | Development, direct `prisma` devDependency |
| Reachable path | `prisma generate`, `prisma migrate`, and `prisma validate` |
| Patched version | The audit's fix is Prisma 7.10.1 |
| Upgrade requirement | New major version |
| Regression risk | Client generation, migrations, and seed would all need a separate upgrade |
| Disposition | Not upgraded and not downgraded |
