# Drive Offer — Backend (Telecom Platform)

A high-performance, secure, and production-ready telecom offer purchasing platform backend designed for the Bangladeshi market. It manages user authentication, automated wallet top-ups via SMS listening devices, package operator/offer configurations, order state machine lifecycles, and audit logging.

Built with **Node.js**, **TypeScript**, **Express**, **MongoDB / Mongoose**, **Redis / BullMQ**, and **Socket.io**.

---

## 🛠️ Technology Stack
- **Runtime & Language**: Node.js + TypeScript
- **Framework**: Express (with async error handler wrappers and security headers via Helmet)
- **Database**: MongoDB + Mongoose (uses Multi-document ACID Transactions for financial integrity; requires a replica set configuration)
- **Caching & Rate Limiting**: Redis (`ioredis` + `rate-limit-redis` for distributed rate limiting)
- **Background Jobs**: BullMQ (offloads slow operations like SMTP email sending to background queues with automatic exponential retries)
- **Real-Time Communication**: Socket.io (WebSocket server with JWT authentication for instant push notifications)
- **Image Storage**: Cloudinary (handles private NID verification uploads and public user profiles)
- **Local OCR Engine**: Tesseract.js (extracts NID parameters locally without third-party API dependencies)
- **Email Delivery**: Nodemailer SMTP (e.g., Brevo, Mailtrap, or Gmail App Passwords)
- **Documentation**: Swagger UI auto-generated from Zod schemas

---

## 🏗️ Architecture & Conventions

### 📁 Directory Layout
The codebase follows a modular design pattern grouped by business features:
```
src/
├── config/              # Environment configurations, MongoDB, Redis, and Socket.io connection setup
├── docs/                # OpenAPI/Swagger compilation registry and routes
├── integrations/        # External services (Cloudinary Storage, Nodemailer, NID verification helper)
├── jobs/                # Background queues and workers (BullMQ)
├── middleware/          # Global & route-specific middlewares (auth, upload, rate limits, validation)
├── modules/             # Business modules (controller, service, repository, model, schema, docs)
│   ├── admins/          # Admin accounts, dashboard, and child customer creation logic
│   ├── auditLogs/       # System and user action trails
│   ├── auth/            # Opaque token management, OTPs, device verification
│   ├── driveOffers/     # Bulk/discounted Drive Offers configs
│   ├── notifications/   # In-app user notifications
│   ├── offers/          # General mobile packs
│   ├── operators/       # Telecom operators (Grameenphone, Robi, Banglalink, Teletalk, etc.)
│   ├── orders/          # Core order lifecycle state machine
│   ├── paymentDevices/  # SMS Listener device pairings, heartbeats, and events
│   ├── refunds/         # Auto and manual order refund allocations
│   ├── topups/          # Wallet topup requests and auto SMS verification
│   ├── users/           # Customer accounts, profiles, and NID verification
│   ├── walletTransactions/# Ledger logs for wallet changes
│   └── wallets/         # Ledger balances (uses integer-based poisha)
├── routes/              # Central v1 route mount point
├── sms/                 # SMS normalizing parser system for bKash, Nagad, and Rocket
├── shared/              # Utility helpers, standard API envelopes, custom error classes, and enums
├── app.ts               # Express application initialization
└── server.ts            # Server listener entry point
```

### 🧠 Core Design Decisions
1. **Integer Money representation**: Monetary transactions are computed as integers representing **poisha** (1 BDT = 100 poisha). Floats are never used to prevent precision loss.
2. **Double-Entry Ledger Pattern**: User wallets store balances, but any mutations (deposits, purchases, refunds) must write a corresponding document to the `WalletTransaction` collection inside an ACID Mongoose transaction session.
3. **SMS Verification Normalizer**: Relies on a pattern-matching pipeline to parse incoming transaction SMS formats from bKash, Nagad, and Rocket to match deposits against customer-claimed transaction IDs.
4. **Trusted Device Validation**: Unrecognized device IDs logging into customer accounts trigger an OTP requirement before access is authorized.
5. **Distributed Rate Limiting**: Scoped using `rate-limit-redis` to allow horizontal scalability across multiple server instances.
6. **Asynchronous Background Jobs**: BullMQ processes email tasks (OTPs, temporary PINs) in the background. This ensures API calls return in milliseconds rather than waiting for SMTP handshakes.
7. **Real-Time Push Notifications**: A Socket.io listener accepts authenticated WebSocket connections. Connections join a room keyed by the user's ID (`socket.join(userId)`) to stream instant updates.
8. **Local NID Extraction**: Tesseract.js processes uploaded NID images on the Node.js server. If the image is blurry and a valid NID cannot be read, the server rejects registration with a `ValidationError` (422) asking the user to upload clearer photos.
9. **Swagger Integration**: Validation schemas defined in Zod (`*.schema.ts`) are registered using the OpenAPI Registry (`*.docs.ts`). Any modifications to schemas automatically keep the Swagger documentation in sync.

---

## ⚙️ Environment Variables (`.env`)

| Variable Name | Type / Format | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development \| production \| test` | `development` | Environment mode |
| `PORT` | `number` | `4000` | Server listening port |
| `MONGODB_URI` | `string` | *Required* | MongoDB connection URI (Replica Set required) |
| `REDIS_URL` | `string` | *Required* | Redis connection URI (e.g. `redis://127.0.0.1:6379`) |
| `JWT_ACCESS_SECRET` | `string (>= 16 chars)` | *Required* | Secret key for access token generation |
| `JWT_ACCESS_EXPIRES` | `string` | `15m` | Lifetime of an access token |
| `JWT_REFRESH_SECRET` | `string (>= 16 chars)` | *Required* | Secret key for refresh token generation |
| `JWT_REFRESH_EXPIRES` | `string` | `30d` | Lifetime of a refresh token |
| `SMTP_HOST` | `string` | *Required* | SMTP host address for email delivery |
| `SMTP_PORT` | `number` | `587` | SMTP port |
| `SMTP_SECURE` | `boolean` | `false` | Secure connection (SSL/TLS) |
| `SMTP_USER` | `string` | *Required* | SMTP authentication user |
| `SMTP_PASS` | `string` | *Required* | SMTP authentication password |
| `EMAIL_FROM` | `string` | `no-reply@driveoffer.app` | Outgoing sender email address header |
| `STORAGE_PROVIDER` | `string` | `cloudinary` | Storage driver (defaults to Cloudinary) |
| `CLOUDINARY_CLOUD_NAME` | `string` | *Required* | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | `string` | *Required* | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | `string` | *Required* | Cloudinary API Secret |
| `OTP_EXPIRY_SECONDS` | `number` | `300` | Expiration limit of generated OTPs |
| `OTP_MAX_ATTEMPTS` | `number` | `5` | Maximum entry failures allowed before invalidation |
| `OTP_RESEND_COOLDOWN`| `number` | `60` | Wait limit in seconds before requesting a new OTP |
| `DEVICE_HEARTBEAT_TIMEOUT_SECONDS` | `number` | `120` | Heartbeat limit for device active status |
| `RATE_LIMIT_WINDOW_MS` | `number` | `60000` | Rate limiter tracking duration window |
| `RATE_LIMIT_MAX` | `number` | `100` | Allowed requests per client per window |

---

## 📖 API Documentation (Swagger)

All routes are documented inside the self-hosting Swagger UI:
- **Swagger Documentation Endpoint**: `GET /api/docs`
- **Raw OpenAPI Specification JSON**: `GET /api/docs/openapi.json`

---

## 📡 API Reference Catalog

All paths below are prefixed with `/api/v1`.

### 🔐 1. Authentication Module (`/auth`)

| Endpoint | Method | Auth Required | Description | Request Body Example |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | None | Self-register customer. Triggers local Tesseract OCR. | `Multipart/Form-Data`: `phoneNumber`, `pin`, `fullName`, `email`, `nidFrontImage`, `nidBackImage` |
| `/auth/register/resend` | `POST` | None | Resends registration OTP. | `{"phoneNumber": "017XXXXXXXX"}` |
| `/auth/register/verify` | `POST` | None | Confirms registration and creates account wallet. | `{"phoneNumber": "017XXXXXXXX", "otp": "123456"}` |
| `/auth/login` | `POST` | None | Login customer. Handles trusted device detection. | `{"phoneNumber": "017XXXXXXXX", "pin": "123456", "deviceId": "xxx", "deviceName": "Pixel 7"}` |
| `/auth/login/verify-device` | `POST` | None | Verifies new device OTP. | `{"phoneNumber": "017XXXXXXXX", "deviceId": "xxx", "otp": "123456"}` |
| `/auth/refresh` | `POST` | None | Regenerates active short-lived access JWT. | `{"refreshToken": "eyJ..."}` |
| `/auth/logout` | `POST` | None | Revokes refresh session token. | `{"refreshToken": "eyJ..."}` |
| `/auth/logout-all` | `POST` | Customer | Revokes all refresh sessions. | *None* |
| `/auth/forgot-pin` | `POST` | None | Initiates PIN reset by sending verification code. | `{"phoneNumber": "017XXXXXXXX"}` |
| `/auth/forgot-pin/verify` | `POST` | None | Verifies forgot PIN OTP, returns reset token. | `{"phoneNumber": "017XXXXXXXX", "otp": "123456"}` |
| `/auth/reset-pin` | `POST` | None | Updates account PIN using the verification token. | `{"phoneNumber": "017XXXXXXXX", "token": "xxx", "newPin": "112233"}` |

---

### 👤 2. User Accounts Module (`/users`)

Requires **Customer** authentication headers.

| Endpoint | Method | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `/users/me` | `GET` | Retrieve logged-in customer's profile details. | *None* |
| `/users/me` | `PATCH` | Update profile information. | `{"fullName": "Alex", "email": "alex@mail.com"}` |
| `/users/me/profile-image` | `POST` | Upload and crop user avatar. | `Multipart/Form-Data`: `profileImage` |
| `/users/me/change-pin` | `POST` | Updates active pin. | `{"oldPin": "112233", "newPin": "445566"}` |
| `/users/me/identity` | `GET` | Retrieves processed details from the NID verification. | *None* |
| `/users/me/trusted-devices` | `GET` | List all verified devices linked to account. | *None* |
| `/users/me/trusted-devices/:deviceId` | `DELETE` | Revoke trust for specific device identifier. | *None* |
| `/users/customers` | `POST` | Creates a child user (distributor/agent hierarchy). | `{"phoneNumber": "019XXXXXXXX", "pin": "123456", "fullName": "Agent One", "email": "agent@mail.com"}` |

---

### 📶 3. Operators & Offers Modules (`/operators`, `/offers`, `/drive-offers`)

Requires **Customer** authentication headers.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/operators` | `GET` | Retrieve list of all active telecom operators (GP, Robi, etc.). |
| `/operators/:id` | `GET` | Retrieve specific operator details. |
| `/offers` | `GET` | Retrieve list of all active general offers. |
| `/offers/:id` | `GET` | Retrieve specific general offer details. |
| `/drive-offers` | `GET` | Retrieve list of all active drive offers. |
| `/drive-offers/:id` | `GET` | Retrieve specific drive offer details. |

---

### 💳 4. Wallet & Top-ups Modules (`/wallet`, `/payment-methods`)

Requires **Customer** authentication headers.

| Endpoint | Method | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `/wallet` | `GET` | Get current wallet balance in poisha (integer). | *None* |
| `/wallet/transactions` | `GET` | Retrieve history logs of wallet mutations. | Query params: `page`, `limit` |
| `/wallet/transactions/:id` | `GET` | Get details of a specific ledger entry. | *None* |
| `/payment-methods` | `GET` | Retrieve list of active listening provider phone numbers. | *None* |
| `/wallet/topups` | `POST` | Create a topup balance request. Returns gateway instructions. | `{"provider": "BKASH", "amountBdt": 500}` |
| `/wallet/topups/:id/verify` | `POST` | Submit the transaction ID (TrxID) for automatic SMS claim matching. | `{"transactionId": "AJ93HD8X"}` |
| `/wallet/topups` | `GET` | Retrieve list of previous topups. | Query params: `page`, `limit` |
| `/wallet/topups/:id` | `GET` | Get details of specific topup. | *None* |

---

### 📦 5. Orders & Refunds Modules (`/orders`, `/refunds`)

Requires **Customer** authentication headers.

| Endpoint | Method | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `/orders` | `POST` | Create a purchase order. Mutates wallet balance inside transaction. | `{"offerId": "64c...8a", "offerType": "DRIVE_OFFER", "targetPhoneNumber": "017XXXXXXXX"}` |
| `/orders` | `GET` | List orders created by user. | Query params: `page`, `limit` |
| `/orders/:id` | `GET` | Get details of specific order. | *None* |
| `/refunds` | `GET` | Retrieve user's refund records. | Query params: `page`, `limit` |
| `/refunds/:id` | `GET` | Get details of specific refund. | *None* |

---

### 🔔 6. Notifications Module (`/notifications`) & WebSockets

Requires **Customer** authentication headers.

#### REST API Endpoints:

| Endpoint | Method | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `/notifications` | `GET` | List user notification inbox. | Query params: `page`, `limit` |
| `/notifications/:id` | `GET` | Get details of specific notification. | *None* |
| `/notifications/:id/read` | `POST` | Mark notification as read. | *None* |
| `/notifications/read-all` | `POST` | Mark all inbox items as read. | *None* |

#### Real-Time WebSocket (Socket.io) Integration:
Clients can connect to the Socket.io server to receive real-time notifications:
- **WebSocket URL**: `ws://<host>:<port>` (e.g. `ws://localhost:4000`)
- **Connection Handshake Authentication**: You must provide a valid customer JWT access token.
  - *Option A (Auth handshake)*: Pass token in `auth.token`:
    ```javascript
    const socket = io("ws://localhost:4000", { auth: { token: "YOUR_JWT_ACCESS_TOKEN" } });
    ```
  - *Option B (Query param)*: Pass token in connection query:
    ```javascript
    const socket = io("ws://localhost:4000?token=YOUR_JWT_ACCESS_TOKEN");
    ```
- **Real-Time Event**: Subscribed clients will receive live notification payloads on the **`new_notification`** event channel:
  ```javascript
  socket.on("new_notification", (notification) => {
    console.log("New Notification received:", notification);
  });
  ```

---

### 📲 7. Payment Listener Device Gateway (`/payment-devices`)

Used exclusively by the Android SMS listener app.

| Endpoint | Method | Auth Required | Description | Request Body Example |
| :--- | :--- | :--- | :--- | :--- |
| `/payment-devices/pair` | `POST` | None (Pairing Code) | Pair a new physical SMS device. Returns JWT Device Token. | `{"pairingCode": "559132", "phoneNumber": "018XXXXXXXX", "deviceModel": "Xiaomi Redmi 9"}` |
| `/payment-devices/heartbeat` | `POST` | Device Header | Send ping to report connectivity status. | *None* |
| `/payment-devices/sms-events` | `POST` | Device Header | Upload raw transaction SMS bodies parsed by the listener device. | `{"sender": "bKash", "body": "You have received TK 500 from...", "receivedAt": "2026-08-27T10:10:00Z"}` |

---

### 👑 8. Admin Module (`/admin`)

Requires **Admin** authentication headers (`Authorization: Bearer <admin_jwt>`).

#### 🔑 Admin Auth & Stats
- `POST /admin/auth/login` - Admin login. Body: `{"email": "admin@telecom.com", "password": "secure_password"}` (No auth required)
- `GET /admin/dashboard` - Get system indicators (online devices, pending queue count, operator logs).

#### 👥 Customer Management
- `GET /admin/users` - Retrieve all users (Supports pagination, filter by search / status / role).
- `GET /admin/users/:id` - Get specific customer profile details (including NID links).
- `POST /admin/users` - Register a customer/reseller directly. Body: `{"phoneNumber": "017...", "pin": "12", "fullName": "Test", "email": "test@mail.com", "role": "CUSTOMER"}`
- `PATCH /admin/users/:id` - Update user role, status or details.
- `POST /admin/users/:id/block` - Restrict customer from logging in or making purchases.
- `POST /admin/users/:id/unblock` - Unblock a customer.
- `POST /admin/users/:id/reset-pin` - Direct overwrite of customer's PIN (triggers temporary PIN email background job).
- `DELETE /admin/users/:id` - Soft deletes user account database references.

#### 📡 Operator Configurations
- `GET /admin/operators` - List operators (includes inactive ones).
- `GET /admin/operators/:id` - Operator details.
- `POST /admin/operators` - Create operator. Body: `{"name": "Robi", "logoUrl": "https://..."}`
- `PATCH /admin/operators/:id` - Update operator details.
- `POST /admin/operators/:id/activate` - Make operator public.
- `POST /admin/operators/:id/deactivate` - Disable operator selection.

#### 🏷️ Offers & Drive Offers Management
- `GET /admin/offers` & `GET /admin/drive-offers` - Fetch all created offers.
- `GET /admin/offers/:id` & `GET /admin/drive-offers/:id` - Retrieve details.
- `POST /admin/offers` & `POST /admin/drive-offers` - Add a package.
- `PATCH /admin/offers/:id` & `PATCH /admin/drive-offers/:id` - Modify package details.
- `DELETE /admin/offers/:id` & `DELETE /admin/drive-offers/:id` - Delete package.
- `POST /admin/offers/:id/activate` & `POST /admin/offers/:id/deactivate` - Toggle package visibility.
- `POST /admin/drive-offers/:id/activate` & `POST /admin/drive-offers/:id/deactivate` - Toggle drive package visibility.

#### 📲 Listener Device Configuration
- `POST /admin/payment-devices/pair` - Generates a 6-digit pairing code for Android app registration.
- `GET /admin/payment-devices` - Retrieve all listener devices.
- `GET /admin/payment-devices/:id` - Get device specifications.
- `PATCH /admin/payment-devices/:id` - Adjust device configurations (e.g. status, daily limits).
- `POST /admin/payment-devices/:id/revoke` - Invalidates token and removes device pairing status.
- `GET /admin/payment-devices/:id/events` - Retrieve raw list of SMS messages sent by this device.

#### 📦 Order & Refund Processing
- `GET /admin/orders` - View system-wide order logs.
- `GET /admin/orders/:id` - Get specific details.
- `POST /admin/manual-orders` - Place manual order on behalf of customer. Body: `{"customerId": "64c...", "offerId": "64c...", "offerType": "DRIVE_OFFER", "targetPhoneNumber": "015...", "amountBdt": 400}`
- `POST /admin/orders/:id/process` - Mark a pending order as `PROCESSING` (claims responsibility for execution).
- `POST /admin/orders/:id/complete` - Mark as `COMPLETED`. Triggers buyer notification.
- `POST /admin/orders/:id/fail` - Mark order as `FAILED` (Requires body `{"failureReason": "No response"}`). **Automatically refunds customer's wallet balance inside a database transaction.**
- `POST /admin/orders/:id/cancel` - Cancel active order. Triggers automatic refund if wallet balance was deducted.
- `GET /admin/refunds` - List all refunds.
- `GET /admin/refunds/:id` - Get refund details.
- `POST /admin/orders/:id/refund` - Manually trigger refund for a completed order. Body: `{"reason": "Customer request"}`.

---

## 🏃 Local Setup & Commands

### Prerequisites
- Node.js (version >= 18.0.0)
- MongoDB (Running replica-set mode locally or MongoDB Atlas instance)
- Redis instance (Required for rate limiting and background queues)

### Installation
1. Clone the repository and navigate to its folder.
2. Initialize environment parameters:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` values to supply correct connection strings for MongoDB, Redis, Nodemailer, and Cloudinary credentials.*
3. Install dependencies:
   ```bash
   npm install
   ```

### Execution Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Boots application in watch mode using `tsx` (TypeScript Execute) |
| **Build** | `npm run build` | Compiles codebase to javascript files inside `/dist` folder |
| **Start** | `npm run start` | Executes the production-ready javascript bundle |
| **Type Check**| `npm run typecheck`| Validates typing definitions using `tsc --noEmit` |
| **Lint** | `npm run lint` | Analyzes code structure using ESLint configs |
| **Test** | `npm run test` | Executes unit tests via Vitest runner |

---

## 🔒 Security Practices
- **Data Protection**: User NID images are stored in a private Cloudinary bucket. Retrieval requires signed URL generation, ensuring NID URLs expire shortly after request.
- **PIN Hashing**: User PINs and Admin passwords are encrypted at rest using `argon2`.
- **IP Rate Limiting**: Limiters restrict repetitive access to API entry points (`/login`, `/register`, and OTP verification triggers) using Redis memory-store tracking.
- **Graceful Shutdown**: Intercepts `SIGTERM` and `SIGINT` signals to close active database connections and complete execution-in-flight before process exit.
