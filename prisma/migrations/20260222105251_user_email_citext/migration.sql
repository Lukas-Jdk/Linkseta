-- Enable citext extension (needed for shadow DB too)
CREATE EXTENSION IF NOT EXISTS citext;

-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "email" TYPE citext
  USING "email"::citext;