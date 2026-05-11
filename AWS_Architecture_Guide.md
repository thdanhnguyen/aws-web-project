# AWS Architecture Diagrams — Multi-Tenant POS System

> Dưới đây là 3 cấp độ kiến trúc: 
> 1. **As-Is**: Hiện tại.
> 2. **To-Be (Basic)**: Tối ưu Free Tier ($1/tháng).
> 3. **To-Be (Professional)**: Chuẩn Production, chịu lỗi cao ($15 - $20/tháng).

---

## 🏗️ Lựa chọn kiến trúc theo ngân sách

| Thành phần | Basic ($1/mo) | Professional ($20/mo) |
|---|---|---|
| **Database** | Single-AZ (Không dự phòng) | **Multi-AZ (Tự động Failover)** |
| **Compute** | 1 EC2 (Scalable) | **2 EC2 chạy song song (High Availability)** |
| **Độ tin cậy** | 99% | **99.99%** |
| **Phù hợp** | Đồ án, Testing | **Hệ thống thật cho khách hàng** |

---

## Diagram 1: As-Is Architecture (Current)

```eraser
// As-Is: Current Architecture (Before AWS Migration)
User [icon: user]
EC2_Backend [label: "Backend (Node.js)", icon: aws-ec2]
Neon_DB [label: "Neon PostgreSQL", icon: database]
Gmail_SMTP [label: "Gmail SMTP", icon: mail]
EC2_Backend > Neon_DB
EC2_Backend > Gmail_SMTP
```

---

## Diagram 2: To-Be (Basic — $1/mo)
*Dành cho mục tiêu tối ưu Free Tier tuyệt đối.*

```eraser
// To-Be: Basic (Free Tier Focused)
User [icon: user]

AWS_Cloud [icon: aws] {
  Route_53 [icon: aws-route-53]
  CloudFront [icon: aws-cloudfront]
  S3 [icon: aws-s3]
  
  VPC [icon: aws-vpc] {
    ALB [label: "ALB", icon: aws-elastic-load-balancing]
    EC2 [label: "EC2 t3.micro (App Tier)", icon: aws-ec2]
    RDS [label: "RDS Single-AZ (DB Tier)", icon: aws-rds]
  }
}

// Flow
User > Route_53

// 1. Static Frontend
Route_53 > CloudFront > S3

// 2. API Backend
Route_53 > ALB > EC2 > RDS
```

---

## Diagram 3: To-Be (Professional — $20/mo) 🚀
*Đây là bản nâng cấp đáng giá nếu bạn có credit $10-$20. Đảm bảo hệ thống không bao giờ sập.*

```eraser
// To-Be: Professional (High Availability & 3-Tier Architecture)
User [icon: user]

AWS_Cloud [icon: aws] {

  DNS_CDN [color: orange] {
    Route_53 [icon: aws-route-53]
    CloudFront [icon: aws-cloudfront]
  }

  S3_Frontend [label: "S3 (React Static)", icon: aws-s3]

  VPC [color: green, icon: aws-vpc] {
    
    // ALB thực tế nằm ở giữa các AZ (span AZ A + B)
    ALB [label: "Application Load Balancer (Spans AZ A + B)", icon: aws-elastic-load-balancing]

    // Tách riêng App Tier và Database Tier để kiến trúc rõ ràng hơn
    App_Tier [color: yellow] {
      EC2_A [label: "EC2 Backend (AZ A)", icon: aws-ec2]
      EC2_B [label: "EC2 Backend (AZ B)", icon: aws-ec2]
    }

    Database_Tier [color: red] {
      RDS_Primary [label: "RDS Primary (AZ A)", icon: aws-rds]
      RDS_Standby [label: "RDS Standby (AZ B)", icon: aws-rds]
    }
  }

  Supporting [color: blue] {
    SES [icon: aws-simple-email-service]
    Secrets [icon: aws-secrets-manager]
    CloudWatch [icon: aws-cloudwatch]
  }
}

// ── Request Flow ──
User > Route_53

// 1. Route tĩnh (Frontend React)
Route_53 > CloudFront : "yourdomain.com"
CloudFront > S3_Frontend

// 2. Route động (API Backend)
Route_53 > ALB : "api.yourdomain.com"
ALB > EC2_A
ALB > EC2_B

// 3. Database & Replication
EC2_A > RDS_Primary
EC2_B > RDS_Primary
RDS_Primary > RDS_Standby : Synchronous Replication

// 4. Supporting Services
EC2_A > SES : Send Emails
EC2_B > SES
EC2_A > Secrets : Fetch Keys
EC2_B > Secrets
EC2_A > CloudWatch : Write Logs
EC2_B > CloudWatch

// 5. External Integrations (Outside AWS)
SePay_Webhook [label: "SePay API (External)", icon: webhook]
EC2_A > SePay_Webhook : Payment Status
EC2_B > SePay_Webhook
```

---

## Chi tiết chi phí bản Professional (~$20)

1. **RDS Multi-AZ (~$13/tháng):** 
   - AWS tính phí cho instance Standby thứ 2. 
   - Đây là cái "bảo hiểm" tốt nhất cho dữ liệu multi-tenant.
2. **EC2 thứ 2 (~$8/tháng):** 
   - Chạy 2 con t3.micro song song giúp Load Balancer chia tải tốt hơn.
3. **Route 53 & Secrets (~$1/tháng):** 
   - Chi phí cố định để có hệ thống chuyên nghiệp.

> **Lời khuyên:** Nếu bạn nộp báo cáo, hãy dùng **Diagram 3**. Giáo viên sẽ đánh giá rất cao việc bạn hiểu về **High Availability (HA)** và **Fault Tolerance** — những khái niệm "vàng" trong kiến trúc Cloud.
