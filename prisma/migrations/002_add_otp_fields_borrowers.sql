-- Migration to add OTP fields to borrowers table for email verification
ALTER TABLE public.borrowers 
ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_borrowers_email_otp ON public.borrowers (email, otp);

