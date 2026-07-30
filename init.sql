-- Drop existing tables if they exist (clean reset)
DROP TABLE IF EXISTS review_progress CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create custom users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    designation TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    question_limit INTEGER NOT NULL DEFAULT 0,
    questions_completed INTEGER NOT NULL DEFAULT 0,
    expiry_date TIMESTAMPTZ,
    has_submitted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    existing_answer TEXT NOT NULL,
    reference TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'assigned', 'completed'
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ
);

-- Create responses table (final submitted responses)
CREATE TABLE responses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    original_answer TEXT NOT NULL,
    reference TEXT,
    user_comment TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    new_answer TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Create review_progress table (Auto-save drafts)
CREATE TABLE review_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_comment TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    new_answer TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
);

-- Create admin logs table
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable Row Level Security on all tables
-- (We use the Anon Key in our custom Next.js backend, so RLS must be off)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;
