-- Rebrand platform-owned default templates without changing API identifiers.
UPDATE "field_templates"
SET "name" = 'Default Document Fields', "updated_at" = CURRENT_TIMESTAMP
WHERE "scope" = 'platform'::"TemplateScope"
  AND "is_default" = true
  AND "name" = 'Default Contract Fields';

UPDATE "field_template_items" AS item
SET
  "field_name" = CASE item."field_name"
    WHEN 'Contract Title' THEN 'Document Title'
    WHEN 'Contract Value' THEN 'Document Value'
    ELSE item."field_name"
  END,
  "field_description" = replace(
    replace(item."field_description", 'contracts', 'documents'),
    'contract',
    'document'
  ),
  "updated_at" = CURRENT_TIMESTAMP
FROM "field_templates" AS template
WHERE item."template_id" = template."id"
  AND template."scope" = 'platform'::"TemplateScope"
  AND template."is_default" = true;

UPDATE "prompt_templates"
SET
  "name" = CASE "name"
    WHEN 'Default Contract Comparison Prompt' THEN 'Default Document Comparison Prompt'
    ELSE "name"
  END,
  "content" = replace(
    replace(
      replace(
        replace("content", 'Contracts', 'Documents'),
        'contracts',
        'documents'
      ),
      'Contract',
      'Document'
    ),
    'contract',
    'document'
  ),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "scope" = 'platform'::"TemplateScope"
  AND "is_default" = true;
