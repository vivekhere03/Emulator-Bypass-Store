

# CGX Regedit — Full-Stack Reseller Portal

A modern dark-themed web application built with React + Vite + Supabase, featuring product browsing, individual purchases with Binance Pay, seller credit system, and admin management — all integrated with your existing backend at bypass.cgxhub.in.

---

## 🎨 Design System
- **Dark theme**: `#0a0e17` background, `#111827` cards, indigo/purple accents (`#6366f1`)
- **Fonts**: Inter + JetBrains Mono (for codes/keys)
- **Matching your existing reseller portal aesthetic** from the uploaded HTML

---

## 📄 Pages & Features

### 1. Public Pages (No Login Required)
- **Home/Landing Page**: Hero section with product grid showing all active products with image/video previews, pricing tiers, and "Buy Now" buttons
- **Product Detail Page**: Full product info, duration selector (15 days, 1 month, 3 months, 6 months) with prices, username input field, and purchase CTA
- **Auth Pages**: Login, Register, Forgot Password — with email-based authentication via Supabase Auth

### 2. Individual Purchase Flow
- User selects a product → enters desired username → picks duration → sees price
- Clicks "Pay with Binance Pay" → redirected to payment
- **Edge function** calls `https://payment.offlinee.online/api/verify-payment` with `transaction_id`, `payment_type`, `expected_amount` and `x-api-key` header
- On `verified: true` → edge function calls `https://bypass.cgxhub.in/api/v2/users/add` with HMAC-SHA256 signing (timestamp + body, using your HMAC secret)
- **Success Page**: Shows username, expiry date, and downloadable PDF invoice

### 3. Seller Dashboard (Login Required — Seller Role)
- **Overview**: Credit balance, total users added, API key status
- **Buy Credits**: Credit packages displayed as cards → Binance Pay checkout → same payment verification flow → credits added to account
- **API Key Management**: View current API key, copy to clipboard, regenerate key
- **User Management via API**: 
  - Add User (calls `/api/v2/users/add`)
  - Extend User (calls `/api/v2/users/extend`)
  - Reset HWID (calls `/api/v2/users/reset-hwid`)
  - Remove User (calls `/api/v2/users/remove`)
  - Each action deducts credits from seller's balance
- **Activity Log**: All actions with timestamps

### 4. Admin Dashboard (Login Required — Admin Role)
- **Stats Overview**: Total users, active licenses, expired, total sellers, revenue
- **Product Management**: CRUD for products — upload images/videos to Supabase Storage, set name, description, duration options with prices
- **Seller Management**: View all sellers, add credits manually, create seller accounts, approve/suspend sellers
- **Backend Users**: View all users from the CGX backend (via API), add/edit/remove
- **Orders**: View all purchase transactions with filters and search
- **Credit Packages**: Manage credit package tiers (amount, price)
- **Settings**: Payment API config, backend API keys (HMAC secret, API key), auto-approval toggle for new sellers

### 5. Common Features (All Logged-in Users)
- **Transaction History**: All payments made
- **Credit Logs** (sellers): Credits purchased, credits spent per action
- **API Usage Logs** (sellers): Every API call with timestamp, endpoint, result
- **Invoices**: View and download past invoices as PDF

---

## 🗄️ Database (Supabase/PostgreSQL)

**Tables:**
- `products` — name, description, image_url, video_url, is_active, created_at
- `product_durations` — product_id, duration_label, duration_days, price
- `orders` — user_id, product_id, duration_id, username_created, transaction_id, amount, status, invoice_url
- `sellers` — user_id, credit_balance, api_key_hash, status (active/suspended), auto_approved
- `credit_packages` — name, credits, price
- `credit_transactions` — seller_id, amount, type (purchase/deduction), description, order_id
- `api_usage_logs` — seller_id, endpoint, request_body, response_status, credits_used
- `site_settings` — key-value store for payment API config, backend keys, toggles
- `user_roles` — user_id, role (admin/seller/user) with security definer function

**Storage Buckets:**
- `product-media` — for product images and videos

---

## ⚙️ Edge Functions

1. **verify-payment** — Proxies to `payment.offlinee.online/api/verify-payment` with the API key (kept as Supabase secret, never exposed to client)
2. **create-backend-user** — After payment verification, calls `bypass.cgxhub.in/api/v2/users/add` with HMAC-SHA256 signing
3. **seller-api-proxy** — Handles seller API calls to backend (add/extend/reset-hwid/remove), validates seller auth, checks credit balance, deducts credits
4. **generate-invoice** — Creates downloadable invoice data

---

## 🔐 Security
- All sensitive keys (HMAC secret, payment API key, backend API key) stored as Supabase secrets — never in frontend code
- HMAC signing done server-side in edge functions only
- Role-based access with `user_roles` table + `has_role()` security definer function
- RLS policies on all tables
- Seller API keys hashed in database

