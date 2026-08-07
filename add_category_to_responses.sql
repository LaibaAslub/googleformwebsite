-- Add category column to responses and review_progress tables
ALTER TABLE responses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE review_progress ADD COLUMN IF NOT EXISTS category TEXT;
