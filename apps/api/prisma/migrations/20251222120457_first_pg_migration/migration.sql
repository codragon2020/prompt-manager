-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VarType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerTeam" TEXT,
    "status" "PromptStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "modelName" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "topP" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVariable" (
    "id" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VarType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,

    CONSTRAINT "PromptVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTag" (
    "promptId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PromptTag_pkey" PRIMARY KEY ("promptId","tagId")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptPublication" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PromptPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Prompt_name_idx" ON "Prompt"("name");

-- CreateIndex
CREATE INDEX "PromptVersion_promptId_idx" ON "PromptVersion"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_version_key" ON "PromptVersion"("promptId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVariable_promptVersionId_name_key" ON "PromptVariable"("promptVersionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_key_key" ON "Environment"("key");

-- CreateIndex
CREATE INDEX "PromptPublication_promptId_environmentId_idx" ON "PromptPublication"("promptId", "environmentId");

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVariable" ADD CONSTRAINT "PromptVariable_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTag" ADD CONSTRAINT "PromptTag_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTag" ADD CONSTRAINT "PromptTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptPublication" ADD CONSTRAINT "PromptPublication_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptPublication" ADD CONSTRAINT "PromptPublication_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptPublication" ADD CONSTRAINT "PromptPublication_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
