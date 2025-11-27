-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "payTokenId" INTEGER NOT NULL,
    "payTo" TEXT NOT NULL,
    "payAmount" TEXT NOT NULL,
    "receiveTokenId" INTEGER NOT NULL,
    "receiveAmount" TEXT NOT NULL,
    "paymentCalldata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_symbol_key" ON "Currency"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_tokenAddress_key" ON "Currency"("tokenAddress");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_payTokenId_fkey" FOREIGN KEY ("payTokenId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_receiveTokenId_fkey" FOREIGN KEY ("receiveTokenId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
