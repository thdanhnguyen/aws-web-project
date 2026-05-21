# Database Diagram (ERD)

Sơ đồ dưới đây mô tả cấu trúc cơ sở dữ liệu của hệ thống POS, sử dụng cú pháp **Mermaid**. Bạn có thể copy đoạn code này và dán trực tiếp vào **draw.io** (chọn `Arrange` > `Insert` > `Advanced` > `Mermaid`) hoặc xem trực tiếp trên GitHub/Markdown Viewer có hỗ trợ Mermaid.

```mermaid
erDiagram
    %% Quan hệ giữa các bảng
    tenants ||--o{ users : "has"
    tenants ||--o{ customers : "has"
    tenants ||--o{ products : "has"
    tenants ||--o{ invoices : "has"
    tenants ||--o{ shifts : "has"

    users ||--o{ refresh_tokens : "has"
    users ||--o{ shifts : "manages"

    products ||--|| product_details : "has"
    products ||--o{ invoice_items : "included_in"

    customers ||--o{ invoices : "makes"

    invoices ||--o{ invoice_items : "contains"

    %% Cấu trúc bảng Tenants
    tenants {
        string id PK
        string name
        string domain UK
        string access_code
        timestamp created_at
    }

    %% Cấu trúc bảng Users
    users {
        int id PK
        string tenant_id FK
        string email UK
        string password_hash
        string full_name
        string role "admin | staff"
        timestamp created_at
    }

    %% Cấu trúc bảng Refresh Tokens
    refresh_tokens {
        int id PK
        int user_id FK
        string token UK
        timestamp expires_at
        timestamp created_at
    }

    %% Cấu trúc bảng Customers
    customers {
        int id PK
        string tenant_id FK
        string name
        string email
        string phone
        timestamp created_at
    }

    %% Cấu trúc bảng Products
    products {
        int id PK
        string tenant_id FK
        string name
        string sku
        timestamp created_at
    }

    %% Cấu trúc bảng Product Details
    product_details {
        int id PK
        int product_id FK "UK"
        numeric price
        text description
        string material
        string origin
        int stock
        string category
    }

    %% Cấu trúc bảng Invoices
    invoices {
        int id PK
        string tenant_id FK
        int customer_id FK
        numeric subtotal
        numeric tax
        numeric total_amount
        string payment_status "Paid | Unpaid"
        timestamp created_at
    }

    %% Cấu trúc bảng Invoice Items
    invoice_items {
        int id PK
        int invoice_id FK
        int product_id FK
        int quantity
        numeric price_at_purchase
        string color
        string size
    }

    %% Cấu trúc bảng Shifts
    shifts {
        int id PK
        string tenant_id FK
        int user_id FK
        numeric opening_cash
        string status "open | closed"
        timestamp opened_at
        timestamp closed_at
        int total_orders
        numeric total_sales
    }
```
