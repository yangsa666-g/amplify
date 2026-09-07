# Release Notes: v0.6.0 Team-Level Access

## Highlights

- Added organization-level tenant isolation with `Organization`.
- Added platform `super_admin` role.
- Kept organization `admin` and `user` roles.
- Reused the existing User Management page for organization and user administration.
- Added Super Admin organization context switching with `X-Organization-Id`.
- Let Super Admin run contract analysis and compare directly in `Platform Defaults`.

## Backend

- JWT auth now reloads user and organization state on every request.
- Disabled users and disabled organizations are blocked immediately.
- Admin routes now allow Super Admin, while data access remains organization-scoped.
- User deletion now disables accounts instead of hard deleting data.
- Entra SSO no longer creates unknown users automatically.
- External API keys are scoped to one organization.
- Documents, analysis jobs, compare jobs, history, dashboard, audit, templates, models, and API keys now carry or respect organization scope.

## Database

- Added `organizations`.
- Added `organization_id` to tenant-owned data tables.
- Added `TemplateScope` and `OrganizationModelSetting`.
- Added role/organization consistency check constraints.
- Added indexes and partial unique indexes for tenant queries and defaults.
- Added migration that moves legacy data into `legacy_organization`, converts old Admin users to Super Admins, and revokes refresh tokens.
- Added migration/seed coverage for hidden `platform_defaults` business storage.

## Frontend

- Added Super Admin organization selector in the application header.
- `Platform Defaults` remains the default Super Admin context and supports normal contract analysis/compare workflows.
- Added Organizations tab inside User Management for Super Admin.
- Added organization selection for Super Admin user creation.
- Updated route guards and client request headers for Super Admin and selected organization context.

## Compatibility Notes

- Existing API paths are preserved where practical.
- Template API responses still expose compatibility fields such as `isSystem` and `scope: system | personal` for the current UI.
- Existing uploaded files are not physically moved; new Azure Blob uploads use `organizationId/userId` path prefixes.

## Required Operations

- Run Prisma migration against a staging copy first.
- Run `prisma generate` after migration/schema update.
- After migration, manually assign at least one Admin to `legacy_organization`.
- Ask all users to sign in again because refresh tokens are revoked.

## Known Follow-Ups

- Add deeper cross-tenant integration tests.
- Improve UI copy/i18n for the new Organizations tab.
- Optionally implement exact content hashing for identifying official legacy templates during migration.
