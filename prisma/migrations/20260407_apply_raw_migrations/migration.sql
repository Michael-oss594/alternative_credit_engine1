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
  otp VARCHAR(6),
  otp_expires_at TIMESTAMP,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_borrowers_email ON public.borrowers (email);
CREATE INDEX IF NOT EXISTS idx_borrowers_email_otp ON public.borrowers (email, otp);

-- Migration to create borrower_identities table
CREATE TABLE IF NOT EXISTS public.borrower_identities (
  id SERIAL PRIMARY KEY,
  borrower_id INTEGER REFERENCES public.borrowers(id) ON DELETE CASCADE,
  bvn_nin VARCHAR(20) NOT NULL,
  dob DATE NOT NULL,
  mothers_maiden_name VARCHAR(100) NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for borrower_identities
CREATE INDEX IF NOT EXISTS idx_borrower_identities_borrower_id ON public.borrower_identities (borrower_id);

-- Migration to create lenders table for login API with hashed password storage
CREATE TABLE IF NOT EXISTS public.lenders (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  otp VARCHAR(4),
  otp_expires_at TIMESTAMP,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for lenders email
CREATE INDEX IF NOT EXISTS idx_lenders_email ON public.lenders (email);
