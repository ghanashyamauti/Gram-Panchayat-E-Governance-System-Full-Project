-- ============================================================
-- GRAM PANCHAYAT / NAGAR PALIKA - DATABASE SCHEMA v2.0
-- NOTE: Do NOT use 'metadata' as a column name (SQLAlchemy reserved)
--       Use 'event_data' instead.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    aadhar_number VARCHAR(20) UNIQUE,
    address TEXT,
    village_ward VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Maharashtra',
    language_preference VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP TABLE
CREATE TABLE IF NOT EXISTS otp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login',
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(50) DEFAULT 'admin',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SERVICE CATEGORIES
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),
    name_mr VARCHAR(100),
    description TEXT,
    icon VARCHAR(50),
    fee NUMERIC(10,2) DEFAULT 0,
    processing_days INT DEFAULT 7,
    required_docs TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- SERVICE REQUESTS
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category_id INT REFERENCES service_categories(id),
    request_number VARCHAR(30) UNIQUE NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    description TEXT,
    remarks TEXT,
    assigned_to UUID REFERENCES admins(id),
    submitted_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id),
    user_id UUID REFERENCES users(id),
    file_name VARCHAR(255),
    file_path TEXT,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- GRIEVANCES
CREATE TABLE IF NOT EXISTS grievances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    grievance_number VARCHAR(30) UNIQUE NOT NULL,
    category VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ai_category VARCHAR(100),
    ai_priority VARCHAR(20),
    status VARCHAR(30) DEFAULT 'open',
    assigned_to UUID REFERENCES admins(id),
    escalation_level INT DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- GRIEVANCE UPDATES
CREATE TABLE IF NOT EXISTS grievance_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grievance_id UUID REFERENCES grievances(id),
    updated_by UUID REFERENCES admins(id),
    update_text TEXT,
    status VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id),
    user_id UUID REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    purpose VARCHAR(255),
    transaction_id VARCHAR(100) UNIQUE,
    status VARCHAR(30) DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'mock',
    mock_reference VARCHAR(50),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id),
    user_id UUID REFERENCES users(id),
    certificate_type VARCHAR(100),
    certificate_number VARCHAR(50) UNIQUE,
    qr_code TEXT,
    pdf_path TEXT,
    issued_by UUID REFERENCES admins(id),
    valid_until DATE,
    issued_at TIMESTAMP DEFAULT NOW()
);

-- CHAT LOGS
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    user_message TEXT,
    bot_response TEXT,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ANALYTICS LOGS
-- IMPORTANT: Column is named 'event_data' NOT 'metadata' (metadata is reserved by SQLAlchemy)
CREATE TABLE IF NOT EXISTS analytics_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100),
    user_id UUID REFERENCES users(id),
    event_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_service_requests_user   ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_grievances_user         ON grievances(user_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status       ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_payments_user           ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event         ON analytics_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_otp_mobile              ON otp_logs(mobile);

-- NOTE: Admin user and service categories are seeded by app.py on startup.
--       This avoids hardcoding bcrypt hashes that may not match.
