-- CreateTable Borrower
CREATE TABLE IF NOT EXISTS "Borrower" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable BorrowerIdentity
CREATE TABLE IF NOT EXISTS "BorrowerIdentity" (
    "id" TEXT NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "bvnNin" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "mothersMaidenName" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorrowerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for unique email
CREATE UNIQUE INDEX "Borrower_email_key" ON "Borrower"("email");

-- CreateIndex for borrowerId
CREATE INDEX "BorrowerIdentity_borrowerId_idx" ON "BorrowerIdentity"("borrowerId");

-- AddForeignKey
ALTER TABLE "BorrowerIdentity" ADD CONSTRAINT "BorrowerIdentity_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
