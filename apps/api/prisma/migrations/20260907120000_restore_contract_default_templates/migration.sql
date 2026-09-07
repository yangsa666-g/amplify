-- Keep the platform brand document-focused while restoring its built-in
-- default templates to their contract-specific purpose.
UPDATE "field_templates"
SET "name" = 'Default Contract Fields', "updated_at" = CURRENT_TIMESTAMP
WHERE "scope" = 'platform'::"TemplateScope"
  AND "is_default" = true
  AND "name" = 'Default Document Fields';

UPDATE "field_template_items" AS item
SET
  "field_name" = CASE item."field_name"
    WHEN 'Document Title' THEN 'Contract Title'
    WHEN 'Document Value' THEN 'Contract Value'
    ELSE item."field_name"
  END,
  "field_description" = CASE item."field_description"
    WHEN 'The official title or name of the document'
      THEN 'The official title or name of the contract'
    WHEN 'All parties identified in the document, including full legal names'
      THEN 'All parties involved in the contract, including full legal names'
    WHEN 'The date on which the document becomes effective'
      THEN 'The date on which the contract becomes effective'
    WHEN 'The date on which the document expires or terminates'
      THEN 'The date on which the contract expires or terminates'
    WHEN 'Total monetary value or consideration stated in the document'
      THEN 'Total monetary value or consideration of the contract'
    WHEN 'Terms and schedule for payments described in the document'
      THEN 'Terms and schedule for payments described in the contract'
    WHEN 'The jurisdiction and law that governs the document'
      THEN 'The jurisdiction and law that governs the contract'
    WHEN 'Conditions under which the document may be terminated'
      THEN 'Conditions under which the contract may be terminated'
    ELSE item."field_description"
  END,
  "updated_at" = CURRENT_TIMESTAMP
FROM "field_templates" AS template
WHERE item."template_id" = template."id"
  AND template."scope" = 'platform'::"TemplateScope"
  AND template."is_default" = true;

UPDATE "prompt_templates"
SET
  "name" = CASE "name"
    WHEN 'Default Document Comparison Prompt' THEN 'Default Contract Comparison Prompt'
    ELSE "name"
  END,
  "content" = replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace("content",
                'professional document risk analyst',
                'professional contract risk analyst'
              ),
              'following document text',
              'following contract text'
            ),
            'Relevant document clause',
            'Relevant contract clause'
          ),
          'present in the document text',
          'present in the contract text'
        ),
        'supplies the document text',
        'supplies the contract text'
      ),
      'Compare the supplied documents in detail',
      'Compare the supplied contracts in detail'
    ),
    'document text and controls',
    'contract text and controls'
  ),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "scope" = 'platform'::"TemplateScope"
  AND "is_default" = true;
