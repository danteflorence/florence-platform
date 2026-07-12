# @florence/auth-sdk

Canonical home of the Core SSO verification SDK.

`src/coreAuth.ts` is the single source of truth for the vendored `coreAuth.ts` copies that
live inside each consuming app. Edit it here, then run:

```sh
npm run sync:auth-sdk    # copy the canonical file into the four apps
npm run check:auth-sdk   # verify the copies are byte-identical (CI runs this)
```

Generated copies (never edit these directly — CI fails on drift):

- `apps/core-api/sdk/coreAuth.ts`
- `apps/pathway-api/server/coreAuth.ts`
- `apps/employer-connect-api/server/coreAuth.ts`
- `apps/academy-web/api/src/coreAuth.ts`

Why vendored copies instead of package imports: core-api and academy-api build their Docker
images with their own app directory as the build context, so `packages/` is not reachable at
image-build time. pathway-api and employer-connect-api do copy `packages/` into their build
stage, so they could import this package directly once the remaining two build contexts are
widened — until then, every app consumes the synced copy for consistency.
