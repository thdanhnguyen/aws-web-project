# MEKIE POS — SaaS Point-of-Sale System

A **multi-tenant, web-based Point-of-Sale (POS) SaaS application** built for modern retail businesses. Each tenant (shop/company) operates in a fully isolated environment with dedicated inventory, transactions, and customer data.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🏢 **Multi-Tenant** | Complete data isolation per shop using `tenant_id` |
| 🛍️ **Public Storefront** | Customer-facing shop page with product browsing & cart |
| 🧾 **POS Cashier** | Staff dashboard for creating transactions instantly |
| 📦 **Inventory Management** | Real-time stock tracking with out-of-stock enforcement |
| 📧 **Email Receipts** | HTML email receipts sent automatically after checkout |
| 💳 **QR Payment** | SePay payment gateway integration (VietQR) |
| 🔐 **JWT Auth** | Access Token (10min) + Refresh Token (7d) + HttpOnly Cookie |
| 📊 **Transaction History** | Paginated history with Paid/Unpaid status badge |
| 🔍 **Product Discovery** | Public marketplace to discover all registered shops |

---

## 🏗️ Architecture

```
CloudWebProject/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── app.ts              # Express app + middleware pipeline
│   │   ├── server.ts           # HTTP server entry point
│   │   ├── config/
│   │   │   └── database.ts     # PostgreSQL connection pool (NeonDB)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── public.controller.ts
│   │   │   └── transaction.controller.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts   # JWT auth + validateIdParam + requireBody
│   │   │   └── app.middleware.ts    # Logger, RateLimiter, SecurityHeaders, ErrorHandler
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── product.routes.ts
│   │   │   ├── public.routes.ts
│   │   │   └── transaction.routes.ts
│   │   └── utils/
│   │       ├── asyncHandler.ts     # Async error wrapper + AppError class
│   │       └── mailer.ts           # Nodemailer HTML receipt email
│   ├── init.sql                # Full DB schema (run once to initialize)
│   ├── add_stock.sql           # Migration: add stock column to product_details
│   └── .env                    # Environment variables (see setup below)
│
└── frontend/                   # React + TypeScript + Vite + TailwindCSS
    └── src/
        ├── App.tsx             # Main POS dashboard (Sell, Warehouse, History views)
        ├── main.tsx            # React entry point
        ├── pages/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Discovery.tsx   # Public shop discovery page
        │   └── PublicStore.tsx # Customer-facing storefront
        └── index.css           # Global styles
```

---

## 🗄️ Database Schema (3NF — PostgreSQL)

```sql
tenants          -- Shops/companies (multi-tenant root)
  └── users      -- Staff accounts per tenant
  └── products   -- Product catalog per tenant
       └── product_details  -- Price, stock, material, description
  └── customers  -- Customer records per tenant
  └── invoices   -- Transaction headers (payment_status: Paid/Unpaid)
       └── invoice_items    -- Line items per transaction
refresh_tokens   -- JWT refresh token store (revocable)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL (or NeonDB cloud)
- Gmail account with App Password (for email receipts)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**`backend/.env`**
```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string

# Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM=your_email@gmail.com

# Security (change in production!)
JWT_SECRET=your_jwt_secret_here
REFRESH_SECRET=your_refresh_secret_here

# SePay Payment Gateway
SEPAY_API_KEY=your_sepay_api_key
SEPAY_MERCHANT_ID=your_merchant_id
SEPAY_SECRET_KEY=your_secret_key
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Initialize Database

Open pgAdmin or any PostgreSQL client and run:
```bash
# Full initialization (tables + sample data)
backend/init.sql

# If upgrading existing DB (add stock column)
backend/add_stock.sql
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔌 API Reference

### Public Routes (no auth required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/shops` | List all registered shops |
| `GET` | `/api/public/shops/:tenantId/products` | Get shop's public product catalog |
| `POST` | `/api/transactions` | Create a new transaction (checkout) |
| `GET` | `/api/transactions/:id/status` | Poll payment status |
| `POST` | `/api/transactions/webhook/sepay` | SePay IPN webhook endpoint |

### Auth Routes
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new shop + staff account |
| `POST` | `/api/auth/login` | Login → returns Access Token |
| `POST` | `/api/auth/refresh` | Refresh Access Token using HttpOnly cookie |
| `POST` | `/api/auth/logout` | Revoke refresh token + clear cookie |

### Protected Routes (requires `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List products for logged-in tenant |
| `POST` | `/api/products` | Create new product |
| `PUT` | `/api/products/:id` | Update product + stock |
| `DELETE` | `/api/products/:id` | Delete product |
| `GET` | `/api/transactions/history` | Transaction history for tenant |

---

## 💳 SePay Payment Gateway Setup

MEKIE POS integrates with **SePay Payment Gateway** for QR bank transfer payments.

### Step 1 — Register & Get Credentials
1. Go to [https://my.sepay.vn/register](https://my.sepay.vn/register)
2. Navigate to **Cổng thanh toán → Đăng ký → Bắt đầu ngay**
3. Start with **Sandbox** for testing
4. Copy your **MERCHANT ID** and **SECRET KEY**

### Step 2 — Configure Environment
```env
SEPAY_API_KEY=your_sepay_api_key        # For webhook verification
SEPAY_MERCHANT_ID=your_merchant_id      # For checkout initiation
SEPAY_SECRET_KEY=your_secret_key        # For signature generation
```

### Step 3 — Configure IPN (Webhook)
In your SePay dashboard, set the IPN URL to:
```
https://your-backend-domain.com/api/transactions/webhook/sepay
```

The webhook receives `ORDER_PAID` notifications and automatically marks invoices as `Paid`.

### Step 4 — Go Live
1. Link a real bank account at [https://my.sepay.vn](https://my.sepay.vn)
2. Switch to **Production** mode
3. Update `MERCHANT_ID`, `SECRET_KEY` from Sandbox → Production values
4. Production checkout endpoint: `https://pay.sepay.vn/v1/checkout/init`

> ⚠️ **Note:** The current webhook implementation uses `SEPAY_API_KEY` header verification. In production, also validate the request signature using `SEPAY_SECRET_KEY` for maximum security.

---

## 🔒 Security Architecture

```
Request → securityHeaders → requestLogger → payloadSizeGuard
       → CORS → JSON parser
       → [/api/auth] → authRateLimiter (20 req/15min/IP)
       → Routes
       → notFoundHandler (404)
       → globalErrorHandler (catches all unhandled errors)
```

**JWT Flow:**
- Login → `accessToken` (10min, in JSON) + `refreshToken` (7d, HttpOnly cookie)
- API calls → `Authorization: Bearer <accessToken>`
- Token expired → `POST /api/auth/refresh` (auto-refresh in frontend)
- Logout → delete from DB + clear cookie

---

## 🧑‍💻 Multi-Tenant Design

Every database table has a `tenant_id` column. All queries filter by `tenant_id` extracted from the JWT payload — ensuring **complete data isolation** between shops.

**Registration flow:**
- If email domain is new → create new tenant + first staff user
- If email domain exists → verify `access_code` → add user to existing tenant

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **Routing** | React Router DOM v7 |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL (NeonDB Serverless) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Email** | Nodemailer (Gmail SMTP) |
| **Payment** | SePay Payment Gateway |
| **Dev Tools** | tsx (watch mode), pgAdmin |

---

## 📝 License

Academic project — built for SaaS POS demonstration purposes.
