-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT,
    "accountNumber" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "score" INTEGER,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "accountNumber" TEXT,
    "transactionDate" TEXT NOT NULL,
    "transactionReference" TEXT,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION,
    "credit" DOUBLE PRECISION,
    "category" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "statementId" TEXT NOT NULL,
    "avgIncome" DOUBLE PRECISION,
    "totalDebit" DOUBLE PRECISION,
    "avgBalance" DOUBLE PRECISION,
    "negativeBalanceDays" INTEGER,
    "bounceCount" INTEGER,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("statementId")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
