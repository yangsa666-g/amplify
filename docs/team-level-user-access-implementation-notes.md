# Team-Level User Access Implementation Notes

## Summary

This change introduces organization-level tenant isolation on top of the existing user-level access model.

The application now models:

- `super_admin`: platform administrator, no organization membership.
- `admin`: organization administrator, belongs to exactly one organization.
- `user`: organization user, belongs to exactly one organization and can only access personal business data.

Super Admin can optionally select an organization context through `X-Organization-Id`. Organization-scoped requests then use that selected organization. Without a selected organization, Super Admin operates in platform context for global configuration such as platform default models/templates.

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
- Organization API key is unique per organization.
- Custom model name is unique per organization.
- Default field/prompt templates use partial unique indexes for platform and organization scopes.

Migration behavior:

- Creates `legacy_organization`.
- Assigns existing business data to `legacy_organization`.
- Converts existing Admin users to `super_admin` and clears their organization.
- Keeps existing normal users in `legacy_organization`.
- Revokes refresh tokens so role/organization changes take effect immediately.

## Backend Changes

Auth:

- `JwtStrategy` reloads user, role, status, and organization status on each request.
- Disabled users and disabled organizations are rejected immediately.
- `X-Organization-Id` is accepted only for Super Admin.
- `AuthUser` now carries organization and selected organization context.

Authorization:

- `RolesGuard` allows Super Admin through existing Admin routes.
- `auth/access-context.ts` centralizes organization-scoped where clauses.

Organization/User management:

- Added `admin/organizations` endpoints.
- Existing `admin/users` endpoints are organization-aware.
- User delete now disables the account.
- Organization Admin cannot manage Super Admins or users outside its organization.
- The last active organization Admin cannot be disabled or downgraded.

Business data:

- Documents, analysis jobs, compare jobs, history, dashboard, feedback reads, and downloads now filter by organization.
- User writes remain personal. Admin can view organization data but cannot submit feedback for another user.
- New documents and jobs write an organization snapshot.

Templates:

- Field and prompt templates use `platform`, `organization`, and `personal` scopes.
- User template lists return platform templates, organization templates, and the user's personal templates.
- Organization Admin manages organization templates.
- Super Admin manages platform templates when no organization is selected, and organization templates when an organization is selected.
- Template promotion requests now stay inside the requester's organization and approve into organization templates.

Models/API Key:

- Custom OpenAI-compatible models are organization-scoped.
- Organization model settings override platform catalog settings.
- External API keys are organization-scoped and stop working when the organization is disabled.

## Frontend Changes

Auth/client:

- User type supports `super_admin` and organization metadata.
- The auth store tracks `selectedOrganizationId`.
- Super Admin keeps `selectedOrganizationId = null` in `Platform Defaults`.
- Axios adds `X-Organization-Id` whenever an organization is selected.

Navigation:

- Super Admin can access Admin routes.
- Header shows an organization context selector for Super Admin.
- `Platform Defaults` can run contract analysis and compare. Backend business writes use hidden `platform_defaults` as the storage tenant so every document/job still has an `organizationId`.

User Management:

- The existing User Management page now also contains an Organizations tab for Super Admin.
- Super Admin can create/edit/disable organizations.
- Super Admin can create users for a selected organization or create Super Admin users.
- Organization Admin continues to see/manage only same-organization Admin/User accounts.

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
- Add API integration tests for cross-organization ID guessing.
- Add browser QA for the Super Admin organization selector and User Management tabs.
- Decide whether legacy system templates should be further classified by exact content match beyond the deterministic seed template names.
