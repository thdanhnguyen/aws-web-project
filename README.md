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

```mermaid
flowchart TD
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:white
    classDef vpc fill:#E6F4EA,stroke:#34A853,stroke-width:2px,color:black
    classDef public fill:#E8F0FE,stroke:#4285F4,stroke-width:2px,color:black
    classDef private fill:#FCE8E6,stroke:#EA4335,stroke-width:2px,color:black
    classDef external fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:black

    User((User))
    Admin((Super Admin))
    SePay[SePay Webhook API]:::external

    subgraph AWS [AWS Cloud]
        direction TB
        
        subgraph DNS [DNS & CDN]
            direction LR
            Route53[Amazon Route 53]:::aws
            CloudFront[Amazon CloudFront]:::aws
        end
        
        S3[S3 Bucket - React Frontend]:::aws

        subgraph VPC [AWS VPC]
            direction TB
            
            subgraph Public [Public Subnets]
                ALB[Application Load Balancer]:::public
            end
            
            subgraph Private [Private Subnets]
                direction TB
                EC2[EC2 Backend - AZ A]:::private
                RDS[(RDS Primary - AZ A)]:::private
            end
        end

        subgraph Support [Supporting Services]
            direction LR
            SES[Amazon SES]:::aws
            Secrets[Secrets Manager]:::aws
            CloudWatch[Amazon CloudWatch]:::aws
        end
    end

    %% Flows
    User --> Route53
    Admin --> Route53
    
    Route53 --> CloudFront
    CloudFront --> S3

    Route53 --> ALB
    ALB --> EC2
    
    EC2 --> RDS
    
    EC2 -.-> SES
    EC2 -.-> Secrets
    EC2 -.-> CloudWatch
    
    EC2 --> SePay
```

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
