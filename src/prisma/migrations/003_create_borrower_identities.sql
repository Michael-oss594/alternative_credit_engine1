-- Migration to create borrower_identities table
CREATE TABLE IF NOT EXISTS public.borrower_identities (
  id SERIAL PRIMARY KEY,
  borrower_id INTEGER REFERENCES public.borrowers(id),
  bvn_nin VARCHAR(20) NOT NULL,
  dob DATE NOT NULL,
  mothers_maiden_name VARCHAR(100) NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrower_identities_borrower_id ON public.borrower_identities (borrower_id);
