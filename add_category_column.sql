-- Add category column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS category text;
