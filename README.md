# 🏛️ Smart e-Governance System
## Gram Panchayat / Nagar Palika — Maharashtra

A complete, production-ready e-governance portal for citizen services, grievance redressal, document management, and administration.

---

## ✅ Bug Fixes in This Version (v2.0)

| # | Bug | Fix |
|---|-----|-----|
| 1 | `metadata` column in `AnalyticsLog` caused `InvalidRequestError` | Renamed to `event_data` in models.py AND schema.sql |
| 2 | `app.py` had no seed function — admin login failed on fresh install | Added `_seed_initial_data()` that auto-creates admin & 10 services |
| 3 | `schema.sql` had wrong bcrypt hash for admin | Removed hardcoded hash; seed function now generates it at runtime |
| 4 | `ServiceCategory` model missing `required_docs` field | Added column & exposed in `to_dict()` |
| 5 | `schema.sql` missing `required_docs` column | Added to table definition |

---

## 📋 Features

| Module | Features |
|--------|----------|
| **Authentication** | Mobile OTP login, JWT tokens, Admin password login |
| **Services** | 10 certificate/service types, apply online, upload documents |
| **Grievances** | AI keyword categorization & priority, escalation tracking |
| **Payments** | 100% mock payment flow: initiate → verify → receipt |
| **Certificates** | PDF with QR code via ReportLab + qrcode |
| **AI Chatbot** | Cohere `command-r` when key set; rule-based fallback otherwise |
| **Admin Panel** | Approve/reject requests, handle grievances, stats |
| **Analytics** | Service trends, grievance stats, revenue reporting |
| **Tracking** | Public tracking by request or grievance number |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + Tailwind CSS + Axios + React Router
- **Backend:** Python Flask REST API
- **Database:** PostgreSQL + SQLAlchemy ORM
- **Auth:** JWT + Mobile OTP (mock OTP always `123456` in dev)
- **AI Chatbot:** Cohere `command-r` with rule-based fallback
- **PDF:** ReportLab + qrcode[pil]
- **Payments:** 100% mock — no real gateway
- **Deployment:** Docker + docker-compose

---

## 🔐 Default Credentials

| Role | Username | Password / OTP |
|------|----------|----------------|
| **Admin** | `admin` | `Admin@123` |
| **Citizen OTP** | Any 10-digit mobile | `123456` (always, dev mode) |

---

## 🚀 Option A — Docker (Recommended)

### Prerequisites
- Docker Desktop installed and running

### Steps

```bash
# 1. Extract the project and cd into it
cd gram-panchayat

# 2. (Optional) Set Cohere API key for AI chatbot
#    Without it, chatbot uses smart rule-based fallback — works fine
export COHERE_API_KEY=your_cohere_key_here   # Linux/Mac
set COHERE_API_KEY=your_cohere_key_here       # Windows CMD

# 3. Build and start all services
docker-compose up --build

# 4. Wait ~2-3 minutes for first build. You'll see:
#    gram_backend | ✅ Default admin created → username: admin | password: Admin@123
#    gram_backend | ✅ 10 service categories seeded

# 5. Open browser
#    Citizen Portal:  http://localhost:3000
#    Admin Panel:     http://localhost:3000/login  (switch to Admin tab)
#    API Health:      http://localhost:5000/api/health
```

### Stop
```bash
docker-compose down          # stop
docker-compose down -v       # stop + delete data
```

---

## 🖥️ Option B — Manual Setup (Windows/Linux/Mac)

### Step 1 — PostgreSQL
Install PostgreSQL 14+ and create the database:
```sql
CREATE DATABASE gram_panchayat;
```

Apply schema:
```bash
# Windows
psql -U postgres -d gram_panchayat -f database\schema.sql

# Linux/Mac
psql -U postgres -d gram_panchayat -f database/schema.sql
```

### Step 2 — Backend

```bash
cd gram-panchayat/backend

# Create virtual environment
python -m venv venv

# Activate
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env from example
copy .env.example .env         # Windows
cp .env.example .env           # Linux/Mac

# Edit .env — set DATABASE_URL to your PostgreSQL connection
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/gram_panchayat

# Run backend
python app.py
```

Expected output:
```
✅ Default admin created  →  username: admin  |  password: Admin@123
✅ 10 service categories seeded
 * Running on http://0.0.0.0:5000
```

### Step 3 — Frontend

```bash
cd gram-panchayat/frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Open http://localhost:3000

---

## 💳 Mock Payment Flow

1. Citizen applies for a service
2. Goes to **Payments** → fills amount & purpose
3. Clicks **Pay Now** → gets a transaction ID
4. Enters **any non-empty string** as the mock reference (e.g., `TEST123`)
5. Payment marked successful → receipt generated with receipt number

> No real money. No payment gateway. No Razorpay. No Stripe.

---

## 🤖 AI Chatbot

**Without Cohere API key** (default): Smart rule-based responses for common queries in English, Hindi, and Marathi. Works out of the box.

**With Cohere API key**: Uses `command-r` model for natural language responses.

To enable Cohere:
1. Get a free key at https://cohere.com
2. Set in `.env`: `COHERE_API_KEY=your_key`
3. Or Docker: `export COHERE_API_KEY=your_key` before `docker-compose up`

---

## 📁 Project Structure

```
gram-panchayat/
├── backend/
│   ├── app.py              # Flask app factory + seed data
│   ├── models.py           # SQLAlchemy models (event_data NOT metadata)
│   ├── config.py           # Configuration
│   ├── extensions.py       # db, jwt, cors
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── routes/
│       ├── auth.py         # OTP login, admin login, profile
│       ├── services.py     # Service categories, apply, upload docs
│       ├── grievances.py   # Submit, track, AI categorization
│       ├── payments.py     # Mock payment initiate/verify/receipt
│       ├── certificates.py # PDF+QR generation, download, verify
│       ├── admin.py        # Admin dashboard, approve/reject
│       ├── chatbot.py      # Cohere + rule-based fallback
│       └── analytics.py    # Stats and trends
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/          # Login, Dashboard, Services, Grievances, etc.
│   │   ├── components/     # Navbar, Chatbot
│   │   ├── context/        # AuthContext
│   │   └── utils/api.js    # Axios instance with JWT interceptor
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── database/
│   └── schema.sql          # PostgreSQL schema (event_data NOT metadata)
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP (returns `dev_otp: "123456"` in dev) |
| POST | `/api/auth/verify-otp` | Verify OTP → JWT token |
| POST | `/api/auth/admin/login` | Admin password login |
| GET  | `/api/auth/profile` | Get profile (JWT required) |
| PUT  | `/api/auth/profile` | Update profile (JWT required) |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/services/categories` | List all 10 services |
| POST | `/api/services/apply` | Submit service request |
| POST | `/api/services/{id}/upload` | Upload document |
| GET  | `/api/services/my-requests` | User's requests |
| GET  | `/api/services/track/{number}` | Public tracking |

### Grievances
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/grievances/submit` | Submit (AI auto-categorizes) |
| GET  | `/api/grievances/my-grievances` | User's grievances |
| GET  | `/api/grievances/track/{number}` | Public tracking |

### Payments (Mock)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/initiate` | Initiate payment |
| POST | `/api/payments/verify` | Verify with any string → success |
| GET  | `/api/payments/history` | Payment history |
| GET  | `/api/payments/receipt/{id}` | Get receipt |

### Certificates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/certificates/request/{request_id}` | Generate PDF cert (admin) |
| GET  | `/api/certificates/download/{id}` | Download PDF |
| GET  | `/api/certificates/verify/{cert_number}` | Public QR verification |

### Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot/message` | Send message (auth optional) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Stats |
| GET | `/api/admin/requests` | All requests |
| PUT | `/api/admin/requests/{id}/update` | Approve / Reject |
| GET | `/api/admin/grievances` | All grievances |
| PUT | `/api/admin/grievances/{id}/update` | Update grievance |
| GET | `/api/admin/users` | All users |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Overview stats |
| GET | `/api/analytics/service-trends` | Service usage trends |
| GET | `/api/analytics/grievance-trends` | Grievance breakdown |

---

## 🔒 Production Checklist

- [ ] Change `SECRET_KEY` and `JWT_SECRET_KEY` in `.env`
- [ ] Set `DEBUG=False`
- [ ] Set `MOCK_OTP=False` and integrate real SMS gateway
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS / SSL
- [ ] Set proper `CORS_ORIGINS`
- [ ] Set `COHERE_API_KEY` for AI chatbot

---

## ⚠️ Known SQLAlchemy Gotcha

**Never** name a column `metadata` in SQLAlchemy declarative models. It is a reserved attribute name and will cause:
```
sqlalchemy.exc.InvalidRequestError: Attribute name 'metadata' is reserved
```
This project uses `event_data` instead.

