# MEKIE POS — SaaS Point-of-Sale System

A multi-tenant, web-based Point-of-Sale (POS) SaaS application built for modern retail businesses. Each shop operates in an isolated environment with dedicated inventory, transactions, and customer data.

## 🚀 Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Infrastructure**: AWS (EC2, RDS, S3, CloudFront, Route53, SES)
- **Integrations**: SePay Payment Gateway (VietQR)

---

## 🏗️ AWS Architecture (To-Be)

The system is designed for AWS deployment utilizing a clean, scalable architecture:

![AWS Architecture](docs/aws-architecture.png)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL (Local or Cloud)
- Gmail account (for SMTP email receipts)

### 1. Installation

Clone the repository and install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `.env` files based on the structure below.

**`backend/.env`**
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/pos_db

# JWT Secrets
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret

# Email Config (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# SePay Webhook verification
SEPAY_API_KEY=your_sepay_api_key
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Database Initialization

Execute the SQL script to initialize the tables and sample data:
```bash
# Run via pgAdmin, DBeaver, or command line:
psql -U postgres -d pos_db -f backend/init.sql
```

### 4. Run Development Servers

Start both servers in separate terminals:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Access the POS dashboard at `http://localhost:5173`.
