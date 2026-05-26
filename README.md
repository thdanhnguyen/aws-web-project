# MEKIE POS — Multi-Tenant SaaS Point-of-Sale System

A multi-tenant, web-based Point-of-Sale (POS) SaaS application built for modern retail businesses. Each shop operates in a fully isolated environment with dedicated inventory, staff, transactions, and customer data — powered by a single shared infrastructure.

## ✨ Features

- **Multi-Tenant Architecture** — Tenant-level data isolation via `tenant_id` across all tables
- **Role-Based Access Control (RBAC)** — 3 roles: Super Admin, Shop Admin, Staff
- **POS & Invoicing** — Create invoices, manage cart, track payment status
- **Product Management** — Full CRUD with SKU, category, stock tracking, material & origin
- **QR Payment (SePay / VietQR)** — Automated payment confirmation via IPN Webhook
- **Shift Management** — Open/close shifts, track revenue & order count per shift
- **Staff Management** — Admin invites staff via Access Code, manage team members
- **Email Receipts** — Automated invoice emails with HTML templates via Nodemailer
- **Public Store / Discovery** — Public-facing shop catalog & product listing (no auth required)
- **System Admin Portal** — Super Admin dashboard for tenant CRUD & system monitoring
- **JWT Authentication** — Access Token + Refresh Token (httpOnly cookie) with auto-refresh
- **API Health Check** — `/api/health` endpoint for infrastructure monitoring (ALB, CloudWatch)

---

## 🏗️ AWS Architecture

![AWS Architecture](docs/aws-architecture.png)

> Full architecture breakdown available in [`AWS_Architecture_Guide.md`](AWS_Architecture_Guide.md)

---

## 🚀 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL (AWS RDS) |
| **Auth** | JWT (jsonwebtoken), bcryptjs, cookie-parser |
| **Email** | Nodemailer (SMTP / AWS SES) |
| **Payment** | SePay API — VietQR IPN Webhook |
| **Infrastructure** | AWS (EC2, RDS, S3, CloudFront, SES, IAM, Secrets Manager) |
| **Dev Tools** | tsx (hot-reload), ESLint, Git |

---

## 📁 Project Structure

```
CloudWebProject/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Business logic (auth, product, transaction, shift, system, public)
│   │   ├── middlewares/        # JWT auth, RBAC, rate limiter, security headers, validation
│   │   ├── routes/             # API route definitions (6 modules)
│   │   ├── utils/              # Async handler, email templates (mailer)
│   │   ├── config/             # Database connection (pg Pool)
│   │   ├── app.ts              # Express app setup & middleware pipeline
│   │   └── server.ts           # Entry point
│   ├── init.sql                # Database schema & seed data
│   └── package.json
├── frontend/
│   └── src/
│       ├── App.tsx             # Main SPA (routing, state, UI components)
│       ├── pages/              # Login, Register, Discovery, PublicStore, SystemDashboard, SystemLogin
│       ├── index.css           # Global styles
│       └── main.tsx            # React entry point
├── docs/
│   └── aws-architecture.png
├── AWS_Architecture_Guide.md   # Detailed AWS architecture documentation
└── README.md
```

---

## 🗄️ Database Schema

9 tables with tenant-level isolation and optimized indexing:

| Table | Description |
|---|---|
| `tenants` | Shops/organizations with access codes |
| `users` | Staff & admin accounts (scoped to tenant) |
| `products` | Product catalog (name, SKU) |
| `product_details` | Price, stock, category, material, origin (1:1 with products) |
| `customers` | Customer records per tenant |
| `invoices` | Transaction headers (subtotal, tax, total, payment status) |
| `invoice_items` | Line items (quantity, price at purchase, color, size) |
| `shifts` | Work shifts (opening cash, total orders, total sales) |
| `refresh_tokens` | JWT refresh token storage |

---

## 🔌 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register new account with access code |
| POST | `/login` | Public | Login & receive JWT tokens |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Public | Invalidate refresh token |
| GET | `/staff` | Admin | List all staff in tenant |
| POST | `/staff` | Admin | Create staff account |
| DELETE | `/staff/:id` | Admin | Remove staff |

### Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List all products |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Delete product |

### Transactions (`/api/transactions`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Auth | Create invoice |
| GET | `/history` | Auth | Transaction history |
| GET | `/:id/status` | Public | Check payment status |
| POST | `/webhook/sepay` | External | SePay IPN webhook |

### Shifts (`/api/shifts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/current` | Auth | Get current open shift |
| POST | `/open` | Auth | Open new shift |
| POST | `/close` | Auth | Close current shift |
| GET | `/` | Admin | List all shifts |

### System (`/api/system`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/login` | Super Admin | System admin login |
| GET | `/tenants` | Super Admin | List all tenants |
| POST | `/tenants` | Super Admin | Create tenant |
| DELETE | `/tenants/:id` | Super Admin | Delete tenant |

### Public (`/api/public`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/shops` | Public | List all shops |
| GET | `/shops/:tenantId/products` | Public | Shop product catalog |

### Health (`/api/health`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | System health check |

---

## 🔒 Security

- **JWT Authentication** — Access token (15m) + Refresh token (7d, httpOnly cookie)
- **Password Hashing** — bcryptjs with salt rounds
- **Rate Limiting** — Applied on `/api/auth` to prevent brute-force attacks
- **Security Headers** — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Payload Size Guard** — Request body limited to 1MB
- **Input Validation** — ID param regex validation, empty body rejection
- **Tenant Isolation** — All queries scoped by `tenant_id` from JWT payload

---

## 👥 Role-Based Access Control

| Role | Scope | Permissions |
|---|---|---|
| **Super Admin** | System-wide | Create/delete tenants, system monitoring |
| **Admin** | Per tenant | Full CRUD on products, staff management, shift history, all transactions |
| **Staff** | Per tenant | View products, create transactions, manage own shift |

---

## 🛠️ Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL
- Gmail App Password (for SMTP email)

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration

**`backend/.env`**
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/pos_db

JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

SEPAY_API_KEY=your_sepay_api_key
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Initialize Database

```bash
psql -U postgres -d pos_db -f backend/init.sql
```

### 4. Run Development Servers

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Access the application at `http://localhost:5173`

---

## 📄 License

This project is for educational purposes.
