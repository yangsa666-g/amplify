-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "organization_model_settings_organization_id_enabled_sort_order_" RENAME TO "organization_model_settings_organization_id_enabled_sort_or_idx";

-- RenameIndex
ALTER INDEX "prompt_templates_scope_organization_id_template_type_is_default" RENAME TO "prompt_templates_scope_organization_id_template_type_is_def_idx";
