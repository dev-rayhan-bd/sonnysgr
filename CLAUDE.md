# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md (imported above) holds the binding engineering rules: no `.populate()`, mandatory `QueryBuilder`, facade/sub-service split, Zod on every endpoint, `sendResponse` envelope, the upload rules, and the 23-module scope limit. This file adds only commands and orientation.

## Commands

```bash
npm run dev          # nodemon + ts-node on src/server.ts
npm run build        # tsc -> dist/
npm start            # node dist/server.js
npx tsc --noEmit     # required type check before finishing any change
npm run docs:lint    # redocly lint src/app/docs/openapi.json
npm run docs:build   # render OpenAPI spec to docs.html
```

- There is no test suite and no lint script. `.eslintrc.json` exists, but nothing in `package.json` runs it.
- `npm run create-module` points to `src/app/create_module_tem.ts`, which does not exist, so the script is broken.
- MongoDB must be a replica set (Atlas or local RS) because services use transactions. Copy `.env.example` to `.env`.
- The interactive API docs are served at `/docs` (Redoc over `src/app/docs/openapi.json`). The Postman collection is in `GoSNKR_API_Collection.postman_collection.json`.

## Architecture

**Bootstrap** (`src/server.ts`): connect Mongoose → `seedAdmin()` (`src/app/DB`) → `app.listen` → `initializeSocket(server)` (`src/app/utils/socket.ts`) → start the node-cron jobs (`src/helper/cron.ts`). The cron jobs call facade services directly to expire promotions, holds, offers and sourcing.

**App pipeline** (`src/app.ts`): helmet → mongo-sanitize → **Stripe webhook router mounted before `express.json`** (it needs the raw body, so keep this order) → JSON/urlencoded parsers → CORS → `globalLimiter` on `/api/v1` → `/docs` → `/api/v1` routes → `notFound` → `globalErrorHandler`.

**Routing**: every module router is registered in the `moduleRoutes` array in `src/app/routes/index.ts` under `/api/v1/<path>`. Note that some paths differ from the module folder names: `Pairs` → `/pair`, `Offer` → `/offers`, `ReviewManagement` → `/review`. Dashboard has sub-folders (`Dashboard/auth`, `Dashboard/users`) mounted at `/dashboard` and `/dashboard/users`.

**Module layout** (`src/app/modules/<Name>/`): `<Name>.routes.ts`, `.controller.ts`, `.service.ts`, `.validation.ts`, `.model.ts`, `.interface.ts`. Heavier modules (Order, Chat, Offer, Sourcing, …) add `<Name>FacadeService.ts` plus a `subServices/` folder. Controllers call the facade, and the facade delegates to static sub-service methods. See `Order/OrderFacadeService.ts` for the reference pattern.

**Auth** (`src/app/middleware/auth.ts`):
- `auth(["Retailer"])` or `auth("Buyer", "Reseller")` enforces roles. Passing `false` as the second argument makes the token optional.
- `authorizeUser` accepts any authenticated role.
- `socketAuthMiddleware` authenticates Socket.IO connections.
- The JWT payload type is `IJwtPayload` (`src/interface/jwt.interface.ts`). Roles are `Buyer`, `Retailer`, `Reseller` and `Admin`.

**Real-time**: each socket joins a room named after its `profileId`/`userId`, so you emit to a user with `io.to(userId)`. Chat events (`join_chat`, `typing`, …) are registered in `modules/Chat/Chat.socket.ts`.

**Media**: `src/helper/cloudStorage.ts` is the storage adapter. It uploads to Cloudinary by default and switches to S3 when the AWS env vars are set (`isAwsS3Configured()`). It returns `ICloudUploadResult`. Routes take files through `src/app/middleware/multerMiddleware.ts`.

**Shared constants**: the enums for statuses, types and roles live in `src/utilities/enum.ts`.

## Gotchas: duplicate helper locations

The code has parallel helper trees, so match the import that existing modules use:
- **Module code**: `sendResponse` and `catchasync` come from `src/utilities/` (lowercase `catchasync`). Nearly all controllers import them from there.
- **Middleware and socket internals**: `src/app/utils/` (`catchAsync.ts`, `sendResponse.ts`, `socket.ts`).
- **Config**: there are two config dirs, `src/app/config/index.ts` (the main one) and `src/config/` (Stripe, S3, Mongo clients).
- **Multer**: both `src/helper/multer*.ts` and `src/app/middleware/multer*.ts` exist. New routes should use `src/app/middleware/multerMiddleware.ts`.
