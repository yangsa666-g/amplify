# Team-Level User Access Implementation Notes

## Summary

This change introduces company-level tenant isolation on top of the existing user-level access model.

The application now models:

- `super_admin`: platform administrator, no organization membership.
- `admin`: company administrator, belongs to exactly one organization.
- `user`: company user, belongs to exactly one organization and can only access personal business data.

Super Admin can optionally select a company context through `X-Organization-Id`. Company-scoped requests then use that selected company. Without a selected company, Super Admin operates in platform context for global configuration such as platform default models/templates.

## Database Changes

Primary schema changes are in `apps/api/prisma/schema.prisma` and migration `20260906000000_add_organization_access`.

Added:

- `Organization`
- `OrganizationStatus`
- `TemplateScope`
- `OrganizationModelSetting`
- `Role.super_admin`

Added tenant fields:

- `users.organization_id`
- `documents.organization_id`
- `analysis_jobs.organization_id`
- `compare_jobs.organization_id`
- `field_templates.organization_id`
- `prompt_templates.organization_id`
- `template_requests.organization_id`
- `notifications.organization_id`
- `api_keys.organization_id`
- `openai_compatible_models.organization_id`
- `audit_logs.organization_id`

Important constraints:

- Super Admin must have `organization_id IS NULL`.
- Admin/User must have `organization_id IS NOT NULL`.
- Company API key is unique per organization.
- Custom model name is unique per organization.
- Default field/prompt templates use partial unique indexes for platform and organization scopes.

Migration behavior:

- Creates `legacy_organization`.
- Assigns existing business data to `legacy_organization`.
- Converts existing Admin users to `super_admin` and clears their organization.
- Keeps existing normal users in `legacy_organization`.
- Revokes refresh tokens so role/company changes take effect immediately.

## Backend Changes

Auth:

- `JwtStrategy` reloads user, role, status, and organization status on each request.
- Disabled users and disabled companies are rejected immediately.
- `X-Organization-Id` is accepted only for Super Admin.
- `AuthUser` now carries organization and selected organization context.

Authorization:

- `RolesGuard` allows Super Admin through existing Admin routes.
- `auth/access-context.ts` centralizes company-scoped where clauses.

Company/User management:

- Added `admin/organizations` endpoints.
- Existing `admin/users` endpoints are company-aware.
- User delete now disables the account.
- Company Admin cannot manage Super Admins or users outside its company.
- The last active company Admin cannot be disabled or downgraded.

Business data:

- Documents, analysis jobs, compare jobs, history, dashboard, feedback reads, and downloads now filter by company.
- User writes remain personal. Admin can view company data but cannot submit feedback for another user.
- New documents and jobs write an organization snapshot.

Templates:

- Field and prompt templates use `platform`, `organization`, and `personal` scopes.
- User template lists return platform templates, company templates, and the user's personal templates.
- Company Admin manages company templates.
- Super Admin manages platform templates when no company is selected, and company templates when a company is selected.
- Template promotion requests now stay inside the requester's company and approve into company templates.

Models/API Key:

- Custom OpenAI-compatible models are organization-scoped.
- Organization model settings override platform catalog settings.
- External API keys are organization-scoped and stop working when the company is disabled.

## Frontend Changes

Auth/client:

- User type supports `super_admin` and organization metadata.
- The auth store tracks `selectedOrganizationId`.
- Super Admin keeps `selectedOrganizationId = null` in `Platform Defaults`.
- Axios adds `X-Organization-Id` whenever a company is selected.

Navigation:

- Super Admin can access Admin routes.
- Header shows a company context selector for Super Admin.
- `Platform Defaults` can run contract analysis and compare. Backend business writes use hidden `platform_defaults` as the storage tenant so every document/job still has an `organizationId`.

User Management:

- The existing User Management page now also contains a Companies tab for Super Admin.
- Super Admin can create/edit/disable companies.
- Super Admin can create users for a selected company or create Super Admin users.
- Company Admin continues to see/manage only same-company Admin/User accounts.

## Verification

Completed:

- Prisma schema formatting.
- Prisma schema validation.
- Prisma Client generation.
- API TypeScript typecheck.

Known verification note:

- Web TypeScript check currently stops on an existing missing dependency/type resolution issue for `@lobehub/icons` in `apps/web/src/components/ModelProviderIcon.tsx`. This file was not changed by this feature.

## Follow-Up Checks Before Release

- Run the migration against a database copy and verify row counts by organization.
- Add API integration tests for cross-company ID guessing.
- Add browser QA for the Super Admin company selector and User Management tabs.
- Decide whether legacy system templates should be further classified by exact content match beyond the deterministic seed template names.
