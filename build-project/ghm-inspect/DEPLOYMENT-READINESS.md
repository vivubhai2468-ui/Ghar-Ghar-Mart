# Ghar Ghar Mart — integration and deployment readiness

## What the uploaded source already contains

- Expo / React Native app with web build output in `dist-web/`.
- Express backend and typed tRPC API at `/api/trpc`, plus health endpoint `/api/health`.
- MySQL/Drizzle persistence layer and schema migrations in `drizzle/`.
- Customer catalogue reads from the backend (`products.list`); approved active products come from the database.
- Admin dashboard reads/writes orders, products, sellers, users, delivery pricing, and dashboard statistics through protected admin tRPC procedures.
- Admin banner CRUD uses `admin.banners.*`; the public banner endpoint `banners.list` serves active banners.
- Order creation and order status updates have backend procedures; delivery assignment and delivery pricing also have backend procedures.

## What cannot be confirmed from the ZIP alone

- Whether the currently live Manus admin URL is serving this exact source revision.
- Whether a production database exists, is reachable, and has all migrations applied.
- Whether the live service still has its required environment variables and OAuth provider configuration after the Manus subscription ended.
- Whether customer and admin deployments currently point to the same API/database.
- Whether OTP, push notifications, uploads, and payments work with live provider credentials.

## Required configuration for a separate deployment

The app reads `EXPO_PUBLIC_API_BASE_URL` for its API base URL. The server requires `DATABASE_URL` for MySQL persistence. Email password reset for customers, sellers, and delivery partners uses Resend and requires `RESEND_API_KEY`, `PASSWORD_RESET_EMAIL_FROM` (a verified sender), and `PUBLIC_APP_URL` (the deployed web app origin). Apply the generated reset-token table migration before deploying this flow. Accounts must have an email address on their profile to receive a reset link. New seller and delivery-partner registrations collect this email; existing partner accounts without one must update their profile or contact support before using email recovery. Authentication and platform integrations also use values such as `JWT_SECRET`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `VITE_APP_ID`, `BUILT_IN_FORGE_API_URL`, and `BUILT_IN_FORGE_API_KEY` in the server/runtime code. Exact values must come from the owner's provider dashboards; never commit real credentials to source control or send them in chat.

An `.env.example` is included with placeholder values only. It is not a working configuration.

## Recommended order of operations

1. Choose an independent backend host and managed MySQL database that the owner controls.
2. Confirm the authentication approach before changing OAuth-dependent code. The current source includes Manus-oriented OAuth and built-in storage integrations; these may need replacing for a fully independent deployment.
3. Configure secrets as host environment variables and configure `EXPO_PUBLIC_API_BASE_URL` to the backend's HTTPS origin.
4. Back up any existing production database before applying migrations. Apply reviewed migrations to the chosen database.
5. Deploy the API, verify `GET /api/health` returns `{ "ok": true, ... }`, and verify `GET /api/ready` returns `{ "ok": true, "database": "connected" }`. A 503 response from `/api/ready` means the runtime has no usable database connection.
6. Verify unauthenticated catalogue/banner reads, then sign in as an admin and test product, banner, delivery pricing, and order workflows.
7. Build and deploy the customer app against that same API origin. Keep admin-only procedures protected by server-side role checks.
8. Run end-to-end tests and verify that an admin change is visible in the customer app before announcing launch.

## Current conclusion

The code has substantial shared-backend integration already. The next blocker is deployment/configuration verification, not simply adding API calls. Do not claim the apps are connected in production until both clients are confirmed to use the same deployed API and database and the workflows above pass.
