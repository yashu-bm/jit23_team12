-- ============================================================
-- Smart Legal Assistance System — Complete Database Schema
-- ============================================================
CREATE DATABASE IF NOT EXISTS smart_legal_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE smart_legal_db;

-- ------------------------------------------------------------
-- 1. ROLES & CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT IGNORE INTO roles (name) VALUES ('ROLE_USER'), ('ROLE_LAWYER'), ('ROLE_ADMIN');

CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);
INSERT IGNORE INTO categories (name, description) VALUES
    ('Criminal',   'Cases involving criminal charges, murder, theft, assault, fraud'),
    ('Family',     'Divorce, child custody, alimony, marriage issues'),
    ('Property',   'Real estate, tenant issues, land disputes, leases'),
    ('Corporate',  'Business law, incorporation, mergers, contracts'),
    ('Cyber Crime','Hacking, phishing, data breach, online fraud'),
    ('Labour',     'Employment termination, harassment, salary disputes'),
    ('Tax',        'Income tax, GST, audits, tax evasion'),
    ('Consumer',   'Consumer complaints, defective goods, service issues'),
    ('Civil',      'General civil litigation, torts, damages'),
    ('Intellectual Property', 'Patents, trademarks, copyrights');

-- ------------------------------------------------------------
-- 2. USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    email             VARCHAR(150) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    phone             VARCHAR(20),
    profile_image_url VARCHAR(500),
    role_id           INT NOT NULL,
    is_active         BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    last_seen         TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ------------------------------------------------------------
-- 3. OTP TOKENS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    otp_code    VARCHAR(10) NOT NULL,
    otp_type    VARCHAR(50) NOT NULL, -- EMAIL_VERIFY, PASSWORD_RESET, LOGIN_2FA
    is_used     BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. LAWYER PROFILES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lawyer_profiles (
    user_id                    BIGINT PRIMARY KEY,
    specialization_category_id INT,
    experience_years           INT DEFAULT 0,
    qualification              VARCHAR(255),
    bar_council_number         VARCHAR(100),
    city                       VARCHAR(100),
    state                      VARCHAR(100),
    languages                  VARCHAR(255),
    consultation_fee           DECIMAL(10,2) DEFAULT 0.00,
    availability_status        VARCHAR(50) DEFAULT 'AVAILABLE',
    is_approved                BOOLEAN DEFAULT FALSE,
    bio                        TEXT,
    success_rate               DECIMAL(5,2) DEFAULT 0.00,
    total_cases                INT DEFAULT 0,
    successful_cases           INT DEFAULT 0,
    average_rating             DECIMAL(3,2) DEFAULT 0.00,
    total_reviews              INT DEFAULT 0,
    profile_completion         INT DEFAULT 0,
    created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (specialization_category_id) REFERENCES categories(id)
);

-- ------------------------------------------------------------
-- 5. LEGAL DOCUMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_documents (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_path   VARCHAR(500) NOT NULL,
    file_type   VARCHAR(50),
    file_size   BIGINT,
    ocr_text    LONGTEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status      VARCHAR(50) DEFAULT 'UPLOADED',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 6. RISK REPORTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_reports (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id         BIGINT NOT NULL,
    document_type       VARCHAR(100),
    overall_risk_score  VARCHAR(50),
    risk_percentage     DECIMAL(5,2),
    confidence_score    DECIMAL(5,2),
    simple_summary      TEXT,
    executive_summary   TEXT,
    important_dates     JSON,
    named_entities      JSON,
    obligations         TEXT,
    recommendations     TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES legal_documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clause_analysis (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id         BIGINT NOT NULL,
    clause_type       VARCHAR(100),
    clause_text       TEXT NOT NULL,
    risk_level        VARCHAR(50),
    risk_reason       TEXT,
    safer_alternative TEXT,
    confidence_score  DECIMAL(5,2),
    FOREIGN KEY (report_id) REFERENCES risk_reports(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 7. APPOINTMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    lawyer_id        BIGINT NOT NULL,
    appointment_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    status           VARCHAR(50) DEFAULT 'PENDING',
    meeting_type     VARCHAR(50) DEFAULT 'ONLINE',
    meeting_link     VARCHAR(255),
    notes            TEXT,
    cancellation_reason TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (lawyer_id) REFERENCES lawyer_profiles(user_id)
);

-- ------------------------------------------------------------
-- 8. PAYMENTS & TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id       BIGINT,
    user_id              BIGINT NOT NULL,
    lawyer_id            BIGINT,
    amount               DECIMAL(10,2) NOT NULL,
    currency             VARCHAR(10) DEFAULT 'INR',
    payment_status       VARCHAR(50) DEFAULT 'PENDING',
    payment_method       VARCHAR(50),
    razorpay_order_id    VARCHAR(100) UNIQUE,
    razorpay_payment_id  VARCHAR(100),
    razorpay_signature   VARCHAR(500),
    receipt_url          VARCHAR(500),
    refund_id            VARCHAR(100),
    refund_status        VARCHAR(50),
    notes                TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id       BIGINT NOT NULL,
    transaction_type VARCHAR(50),
    amount           DECIMAL(10,2),
    description      TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS lawyer_earnings (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    lawyer_id    BIGINT NOT NULL,
    payment_id   BIGINT NOT NULL,
    amount       DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount   DECIMAL(10,2) NOT NULL,
    status       VARCHAR(50) DEFAULT 'PENDING',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lawyer_id)  REFERENCES lawyer_profiles(user_id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- ------------------------------------------------------------
-- 9. REVIEWS & RATINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    user_id      BIGINT NOT NULL,
    lawyer_id    BIGINT NOT NULL,
    rating       INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text  TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (user_id)        REFERENCES users(id),
    FOREIGN KEY (lawyer_id)      REFERENCES lawyer_profiles(user_id)
);

-- ------------------------------------------------------------
-- 10. REAL-TIME CHAT
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    lawyer_id  BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_session (user_id, lawyer_id),
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (lawyer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id  BIGINT,
    sender_id   BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    message     TEXT,
    file_url    VARCHAR(500),
    file_name   VARCHAR(255),
    message_type VARCHAR(50) DEFAULT 'TEXT',
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)  REFERENCES chat_sessions(id),
    FOREIGN KEY (sender_id)   REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 11. AI CHATBOT CONVERSATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    session_token VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id      BIGINT NOT NULL,
    role            VARCHAR(20) NOT NULL,   -- user / assistant
    content         TEXT NOT NULL,
    detected_category VARCHAR(100),
    confidence_score  DECIMAL(5,2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chatbot_sessions(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 12. LEGAL NOTICES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_notices (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    notice_type   VARCHAR(100) NOT NULL,
    title         VARCHAR(255) NOT NULL,
    content       LONGTEXT NOT NULL,
    recipient_name VARCHAR(200),
    recipient_address TEXT,
    sender_name    VARCHAR(200),
    status         VARCHAR(50) DEFAULT 'DRAFT',
    file_url       VARCHAR(500),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    type       VARCHAR(50),
    link       VARCHAR(500),
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 14. AI RECOMMENDATIONS LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id              BIGINT NOT NULL,
    query_text           TEXT,
    recommended_category VARCHAR(100),
    confidence_score     DECIMAL(5,2),
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 15. AUDIT LOGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT,
    action     VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    details    TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_lawyer_status          ON lawyer_profiles(is_approved, availability_status);
CREATE INDEX IF NOT EXISTS idx_document_user          ON legal_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_user       ON appointments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_appointment_lawyer     ON appointments(lawyer_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_status         ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_chat_session           ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_user      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_chatbot_session        ON chatbot_messages(session_id);
