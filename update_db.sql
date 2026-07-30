-- Create notifications table for the admin dashboard
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL, -- e.g., 'new_user', 'user_approved', 'user_rejected', 'user_suspended', 'review_submission', 'import_completed', 'system_alert'
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable Row Level Security as we use the Anon Key in our custom Next.js backend
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Password change requests (user submits new password; admin must approve)
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    requested_password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

ALTER TABLE password_reset_requests DISABLE ROW LEVEL SECURITY;

-- Add reference columns
ALTER TABLE questions ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS reference TEXT;
