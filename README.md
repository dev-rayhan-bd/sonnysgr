# Sneaker Hub Backend — Technical Handover

> Code audit: 27 June 2026
> Status: development/incomplete. Production deployment is blocked until the issues below are resolved.

## Project summary

এটি sneaker ও clothing-কেন্দ্রিক multi-vendor e-commerce backend। তিন ধরনের end user আছে:

- **Buyer** — product search/discovery, nearby stores, follow, review, wishlist, cart এবং order।
- **Retailer** — store/branch/profile, inventory, operation hours, products এবং orders।
- **Reseller** — pair listing এবং retailer-এর সঙ্গে offer/counter-offer flow।

Admin dashboard, promotions, notifications, settings, payment এবং real-time chat-এর code-ও আছে। তবে সব module main router-এ mounted নয় এবং কয়েকটি flow অসম্পূর্ণ। তাই নিচে “code exists” ও “API হিসেবে usable”—আলাদা করে বলা হয়েছে।

## Technology stack

| Area | Technology |
|---|---|
| Runtime/language | Node.js, TypeScript 5, ES2022, strict mode |
| API | Express 5 |
| Database | MongoDB, Mongoose 8 |
| Validation | Zod 4 |
| Authentication | JWT bearer token |
| Real-time | Socket.IO 4 |
| Upload/storage | Multer local disk; AWS S3 helpers exist |
| Email | Nodemailer with Gmail SMTP |
| Payment | Stripe dependency/config stub; no working gateway route |
| AI | OpenAI helper exists but currently cannot compile |
| Logging | Winston and daily rotating files |
| Development | ts-node, nodemon, TypeScript compiler |

বর্তমানে test framework, OpenAPI, Dockerfile, CI workflow, lint script, health endpoint বা deployment manifest নেই।

## Architecture, structure and patterns

এটি একটি **modular monolith**, যেখানে feature-first organization এবং layered flow ব্যবহার করা হয়েছে:

```text
src/
├── server.ts                 # DB, HTTP server, Socket.IO, process signals
├── app.ts                    # Express middleware and root router
├── app/
│   ├── routes/index.ts       # Active module mounts
│   ├── middlewares/          # auth, validation, upload, errors
│   └── module/<Feature>/
│       ├── *.routes.ts       # route/middleware composition
│       ├── *.controller.ts   # HTTP adapter
│       ├── *.service.ts      # business and database logic
│       ├── *.model.ts        # Mongoose schema/model
│       ├── *.interface.ts    # TypeScript contracts
│       └── *.validation.ts   # Zod schemas
├── config/                   # environment and integration clients
├── helper/                   # JWT, email, upload and AI helpers
├── socket/                   # Socket.IO setup/response helpers
├── error/                    # application/ODM errors
├── utilities/               # enums and shared utilities
└── shared/                   # logging
```

Patterns and design choices:

- **Router → Controller → Service → Model** request flow.
- Thin controllers and service-based business logic; no separate repository abstraction.
- Selected routes use Zod DTO validation, although many validations are commented out.
- Central async/error flow through `catchAsync`, `ApiError`, and `globalErrorHandler`.
- JWT middleware attaches decoded identity to `req.user`.
- MongoDB transactions are attempted for registration, product creation, checkout and payment completion.
- Auth and Notification use polymorphic Mongoose references (`refPath`).
- Buyer/Retailer use GeoJSON, `2dsphere` indexes and aggregation for nearby discovery.
- Order-time product snapshots and seller-split orders support multi-retailer purchasing.
- Cart uses status transitions (`Active`, `Ordered`, `Removed`) as soft state changes.

## Runtime flow

1. `server.ts` loads env values, overrides DNS resolvers, connects to MongoDB, initializes Socket.IO and listens on `PORT`.
2. `app.ts` installs JSON/form parsing, cookies, unrestricted CORS, `/uploads`, routes, global errors and 404 handling.
3. Protected REST routes expect `Authorization: Bearer <token>`.
4. Socket clients provide a raw JWT through `handshake.auth.token` or authorization header and join their `profileId` room.
5. Controllers return the shared `sendResponse` JSON shape.

`mongoDBConnection()` catches failures without rethrowing, so the process can misleadingly listen even if MongoDB failed.

## Data/domain model

| Domain | Main records and relationships |
|---|---|
| Identity | `Auth` owns credentials/role and points to a `Buyer`, `Retailer`, or `Reseller` profile. A legacy relationship-app `User` model remains. |
| Buyer | Preferences, sizes, brands, notification/privacy settings and GeoJSON location. |
| Retailer | Store, parent/branch relationship, hours, rating, followers and location. |
| Reseller | Profile, approval, subscription and location. |
| Catalog | `Product`, embedded variants, separate `ProductVariant`, and `RecentSearch`. |
| Engagement | retailer follows, user follows, reviews, wishlist/wanted state. |
| Commerce | `Cart`, `Order`, `OrderItem`, `SellerSplitOrder`; orders keep product snapshots. |
| Resale | `Pairs`, `PairRequest`, offer history and fulfillment; `OldPair` is separate/incomplete. |
| Communication | `Conversation`, `Message`, user/admin notifications. |
| Operations | reports, support, FAQ, privacy, terms, promotions and admins. |

Notable indexes: unique emails, unique buyer/product/size cart, unique follow pairs, chat indexes, and buyer/retailer geospatial indexes.

## Currently mounted REST API

There is no `/api` or version prefix. Only these modules are mounted by `src/app/routes/index.ts`:

| Prefix | Endpoints/features |
|---|---|
| `/auth` | register, login, verify/resend code, reset password |
| `/user` | profile read/update, password change, admin-style list/block |
| `/buyer` | notification settings, sizes, brands/interests, profile, nearby/followed product summaries |
| `/retailer` | nearby list/map, inventory, orders, hours, profile and branches |
| `/engagement` | follows, nearby users, follower data, wishlist/wanted list and reviews |
| `/reseller` | home stats, pair request and profile update |
| `/product` | create, search, trending/recent searches, detail, delete recent search |
| `/cart` | add/remove/change quantity, placeholder promo and cart status change |
| `/order` | intended retailer stats/detail routes; currently malformed |
| `/report` | create report with up to four local images |

`GET /` returns a server-running message. Local uploads are public under `/uploads`.

### Code exists but REST is not mounted

**Dashboard, Settings, Notification, Pairs, Promotion, Payment, OldPair and Chat REST** routers are not registered. Chat works only through Socket.IO. Several service functions have no active route, including full cart checkout/payment confirmation, buyer order list, status change, retailer details, approvals, promotion listing, wishlist reads and report listing.

## Socket.IO functionality

Incoming events:

- `send_message` — persist and emit a direct message.
- `get_chat_list` — emits `chat_list`.
- `get_messages` — emits `messages`.
- `send_conversation_request` — creates a conversation request.

The connection is authenticated, but some events trust client-supplied `senderId`/`userId` instead of the verified socket identity. There is no common error boundary around event handlers.

## Functionality status

| Capability | Status |
|---|---|
| Email/OTP/JWT auth | Partial; shape exists, credential security is unsafe |
| Buyer/Retailer/Reseller profiles | Partial; registration creates the selected profile |
| Nearby discovery | Implemented with MongoDB geospatial queries |
| Product/search | Partial |
| Follow/review/wishlist | Mostly implemented; some reads are not routed |
| Cart | Partial; no active get-cart or transactional checkout route |
| Multi-retailer order | Designed in models/services, not wired end-to-end |
| Pair marketplace | Service/router exists but router is not mounted |
| Promotions | Targeting/service exists; router is not mounted |
| Chat | Partial Socket.IO implementation |
| Notifications | Models/services exist; router is not mounted |
| Admin/settings | Present but unmounted; admin service breaks compilation |
| Payment | Placeholder/inconsistent schema; Stripe gateway/webhook absent |
| AWS S3 | Helpers exist; active routes use local disk |
| OpenAI | Helper exists; dependent Date module is missing |

## Complexity hotspots

| File/area | Complexity/risk |
|---|---|
| `Cart.service.ts` (~628 lines) | mutation, placeholder promo, competing checkout concepts, reservation/payment logic; only a subset is exported |
| `Retailer.service.ts` (~564 lines) | geospatial queries, aggregation, inventory, orders, branches and admin functions |
| Product/Buyer/Engagement | large pipelines, filters, recommendations and cross-model writes |
| Order + Checkout | overlapping flows and inconsistent enum/schema assumptions |
| Auth | dynamic profile creation, transaction, email and JWT lifecycle |
| Chat | aggregation-heavy lists, room emission and conversation state |

Cross-cutting complexity comes from legacy/new models (`User` vs role profiles), embedded `variant` vs separate `ProductVariant`, multiple checkout implementations, and extensive dead/commented code. The canonical business flow is not consistently defined.

## Known issues and deployment blockers

### Critical security/correctness

1. Password hashing is commented out; login compares and reset stores plain text.
2. Reset password does not itself require a verified reset token/code.
3. JWT payload omits `role`, although role-aware middleware expects it.
4. Some admin/user mutations have authentication/role checks commented out.
5. REST and Socket.IO CORS allow `*`.
6. Global errors expose stack traces in production.
7. Some socket operations trust client-provided identity.

### Verified TypeScript build failures

`tsc --noEmit` currently fails because of:

- missing `../Post/Post.model` and `ENUM_POST_STATUS` in Dashboard;
- invalid `oldPassword` type use;
- placeholder `.u` calls in OldPair and Payment controllers;
- Zod error path type mismatch;
- missing `Date/Date.interface` used by the AI helper;
- missing `cloudinary` dependency and invalid Cloudinary config keys.

### Runtime/data defects

- Both order route paths omit leading `/`, so expected `/order/...` URLs do not match normally.
- `/buyer/buyer-nearby-product` invokes the interests controller, not the nearby-products controller.
- Cart/checkout code inconsistently uses `product.sizes` and `product.variant`.
- Cart’s unique buyer/product/size index also covers removed/ordered rows, preventing later re-adds.
- Add-to-cart trusts client `unitPrice` rather than database price.
- Active `/cart/place-order` only changes cart status; it creates no order.
- Promo logic is a hard-coded 10% and validates no code.
- Registration commits in `finally`, including after abort; email is sent before final commit.
- Transactions require MongoDB Atlas/replica set; standalone MongoDB will fail.
- Local upload directories are not created and ephemeral hosting loses files.
- S3 env names conflict (`AWS_ACCESS_KEY`/`AWS_ACCESS_KEY_ID`, `S3_BUCKET_NAME`/`AWS_BUCKET_NAME`).
- Notification model names (`Customer`, `Supplier`) do not match Buyer/Retailer.
- Payment model represents subscriptions while checkout expects order payment fields.
- Several files are leftovers from a couple/dating application.
- There are no automated tests for auth, inventory, checkout, payment or authorization.

Deployment must not be considered successful until compilation passes and critical auth/commerce flows are integration-tested.

## Local setup

Prerequisites: current Node.js LTS, npm, and MongoDB Atlas or replica-set MongoDB.

```bash
npm ci
```

Create a root `.env` (never commit real secrets):

```dotenv
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SERVICE=gmail
SMTP_MAIL=<smtp-account>
SMTP_PASSWORD=<app-password>
SERVICE_NAME=Sneaker Hub

# Only after S3 naming is standardized
AWS_REGION=<region>
AWS_ACCESS_KEY_ID=<access-key-id>
AWS_SECRET_ACCESS_KEY=<secret-access-key>
AWS_BUCKET_NAME=<bucket>

# Only if the AI helper is repaired/used
OPENAI_API_KEY=<key>
```

```bash
npm run dev
npx tsc --noEmit
npm run build
npm start
```

At audit time, TypeScript checks and production build fail for the blockers above.

## Production deployment runbook

The service can run on Render, Railway, AWS, DigitalOcean or a VM, but this repository includes no platform configuration.

### Pre-deployment gate

1. Fix all TypeScript errors and make `npm run build` green.
2. Hash/migrate passwords and invalidate any plain-text credentials.
3. Choose one canonical checkout/payment/stock model.
4. Review and mount required routers; enforce role authorization and validation.
5. Use MongoDB Atlas/replica set and test transaction rollback.
6. Move uploads to durable object storage and standardize S3 env names.
7. Add auth, cart, stock-concurrency, checkout, payment-idempotency and access tests.
8. Restrict CORS, hide stacks, validate env, add security headers/rate limiting.
9. Add database-aware `/health` and readiness endpoints.

### Host configuration

- Build: `npm ci && npm run build`
- Start: `npm start`
- Entry: `dist/server.js`
- Configure secrets in the host secret manager.
- Do not rely on local `/uploads` on an ephemeral filesystem.
- Prefer stdout structured logs; persist `logs` only if required.
- Allow the host network in Atlas and use a TLS connection string.
- Enable WebSockets. For multiple instances, add a shared Socket.IO adapter (for example Redis) and an appropriate load-balancing strategy.

### Release verification

```text
GET  /                         -> 200
POST /auth/register-user      -> profile and verification email
POST /auth/login-user         -> valid JWT; wrong password rejected
GET  /product/search-product  -> protected response
Socket connection             -> authenticated room and message delivery
```

Also verify upload persistence, OTP expiry/replay, rollback, duplicate cart handling, stock races and graceful `SIGTERM`. Actual deployment additionally requires the selected platform/project, production env values, domain/DNS and credentials; none are present here.

## Recommended takeover order

1. **Stabilize build** — resolve missing/legacy modules and establish a compiler baseline.
2. **Secure identity** — bcrypt migration, safe reset flow, role-bearing JWT and permissions.
3. **Define canonical domain** — settle Product variant, Payment, Cart and Checkout contracts; remove unrelated remnants.
4. **Finish commerce** — cart read → atomic checkout → gateway/webhook → idempotent order/stock completion.
5. **Audit/mount modules** — only with documented validation and permission matrices.
6. **Operationalize** — durable uploads, config validation, tests, CI, health, monitoring and backups.
7. **Deploy** — staging first; production after smoke, rollback, load and concurrency testing.

## Maintenance guidance

- Split large services by use case: cart commands, pricing, checkout and inventory reservation.
- Validate body, params and query consistently with explicit DTOs.
- Keep one source of truth and naming style for roles/status values.
- Always derive price and identity server-side for writes.
- Verify payment signatures and make callbacks idempotent.
- Tune indexes using real query plans and add pagination.
- Publish OpenAPI/Postman contracts after canonical routes are finalized.

---

This document describes the audited repository, including incomplete and unreachable code; it does not claim those areas are production-ready.
