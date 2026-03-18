-- Migration to create borrowers table for signup API
CREATE TABLE IF NOT EXISTS public.borrowers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  bvn VARCHAR(20),
  nin VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_borrowers_email ON public.borrowers (email);

