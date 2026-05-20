-- Migration: Replace examples/model fields with unified prompt fields per channel

-- Step 1: Add new prompt columns
ALTER TABLE "Channel" ADD COLUMN "ctaPrompt" TEXT;
ALTER TABLE "Channel" ADD COLUMN "enquetePrompt" TEXT;
ALTER TABLE "Channel" ADD COLUMN "previewPrompt" TEXT;

-- Step 2: Migrate existing data into ctaPrompt (concatenate model info + CTA examples)
UPDATE "Channel" SET "ctaPrompt" = CONCAT(
  CASE WHEN "modelName" IS NOT NULL AND "modelName" != '' THEN CONCAT('Nome da modelo: ', "modelName", E'\n') ELSE '' END,
  CASE WHEN "modelProfession" IS NOT NULL AND "modelProfession" != '' THEN CONCAT('Profissão: ', "modelProfession", E'\n') ELSE '' END,
  CASE WHEN "modelCharacteristics" IS NOT NULL AND "modelCharacteristics" != '' THEN CONCAT('Características: ', "modelCharacteristics", E'\n') ELSE '' END,
  CASE WHEN "modelPersonality" IS NOT NULL AND "modelPersonality" != '' THEN CONCAT('Personalidade: ', "modelPersonality", E'\n') ELSE '' END,
  E'\n--- Exemplos de CTA Presente ---\n',
  COALESCE(
    (SELECT STRING_AGG(CONCAT(cp."headline", E'\n', cp."body", E'\n', cp."cta"), E'\n\n---\n\n')
     FROM "CtaPresente" cp WHERE cp."channelId" = "Channel"."id" AND cp."enabled" = true),
    '(nenhum exemplo cadastrado)'
  )
)
WHERE EXISTS (
  SELECT 1 FROM "CtaPresente" cp WHERE cp."channelId" = "Channel"."id"
) OR "modelName" IS NOT NULL OR "modelPersonality" IS NOT NULL;

-- Step 3: Migrate existing data into enquetePrompt
UPDATE "Channel" SET "enquetePrompt" = CONCAT(
  CASE WHEN "modelName" IS NOT NULL AND "modelName" != '' THEN CONCAT('Nome da modelo: ', "modelName", E'\n') ELSE '' END,
  CASE WHEN "modelPersonality" IS NOT NULL AND "modelPersonality" != '' THEN CONCAT('Personalidade: ', "modelPersonality", E'\n') ELSE '' END,
  E'\n--- Exemplos de Enquete ---\n',
  COALESCE(
    (SELECT STRING_AGG(CONCAT(eq."question", E'\n', eq."options"), E'\n\n---\n\n')
     FROM "Enquete" eq WHERE eq."channelId" = "Channel"."id" AND eq."enabled" = true),
    '(nenhum exemplo cadastrado)'
  )
)
WHERE EXISTS (
  SELECT 1 FROM "Enquete" eq WHERE eq."channelId" = "Channel"."id"
) OR "modelName" IS NOT NULL OR "modelPersonality" IS NOT NULL;

-- Step 4: Migrate existing data into previewPrompt (from model profile + copyExamples)
UPDATE "Channel" SET "previewPrompt" = CONCAT(
  CASE WHEN "modelName" IS NOT NULL AND "modelName" != '' THEN CONCAT('Nome da modelo: ', "modelName", E'\n') ELSE '' END,
  CASE WHEN "modelProfession" IS NOT NULL AND "modelProfession" != '' THEN CONCAT('Profissão: ', "modelProfession", E'\n') ELSE '' END,
  CASE WHEN "modelCharacteristics" IS NOT NULL AND "modelCharacteristics" != '' THEN CONCAT('Características: ', "modelCharacteristics", E'\n') ELSE '' END,
  CASE WHEN "modelPersonality" IS NOT NULL AND "modelPersonality" != '' THEN CONCAT('Personalidade: ', "modelPersonality", E'\n') ELSE '' END,
  CASE WHEN "copyExamples" IS NOT NULL AND "copyExamples" != '' AND "copyExamples" != '[]' THEN CONCAT(E'\n--- Exemplos de Copy ---\n', "copyExamples") ELSE '' END
)
WHERE "modelName" IS NOT NULL OR "modelProfession" IS NOT NULL OR "modelCharacteristics" IS NOT NULL OR "modelPersonality" IS NOT NULL OR ("copyExamples" IS NOT NULL AND "copyExamples" != '' AND "copyExamples" != '[]');

-- Step 5: Drop old columns from Channel
ALTER TABLE "Channel" DROP COLUMN "modelName";
ALTER TABLE "Channel" DROP COLUMN "modelProfession";
ALTER TABLE "Channel" DROP COLUMN "modelCharacteristics";
ALTER TABLE "Channel" DROP COLUMN "modelPersonality";
ALTER TABLE "Channel" DROP COLUMN "copyExamples";

-- Step 6: Drop old tables (examples only, keep schedules)
DROP TABLE "CtaPresente";
DROP TABLE "Enquete";
