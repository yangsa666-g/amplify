// =============================================================================
// Contract AI Review — Bicep Parameters
// =============================================================================
// Sensitive values should be provided via CLI --parameters overrides,
// not committed to source control.
//
// Usage:
//   az deployment group create \
//     --resource-group rg-d-app-10009620 \
//     --template-file infra/main.bicep \
//     --parameters infra/main.bicepparam \
//     --parameters pgAdminPassword='...' jwtSecret='...'
// =============================================================================

using 'main.bicep'

// Location (new resources will be created here)
param location = 'southeastasia'

// --- Existing resources (DO NOT create, just reference) ---
param acrName = 'devamplify'
// --- PostgreSQL (will be created) ---
param pgServerName = 'dev-amplify-pg'
param pgAdminLogin = 'pgadmin'
param pgAdminPassword = '' // ⚠️ Provide via CLI: --parameters pgAdminPassword='...'
param pgDatabaseName = 'contract_ai'
param pgSkuName = 'Standard_B1ms'
param pgSkuTier = 'Burstable'
param pgStorageSizeGB = 32

// --- App Service (will be created) ---
param planName = 'dev-amplify-plan'
param appName = 'dev-amplify-app'
param appServiceSku = 'B1'
param imageName = 'contract-ai-review'
param imageTag = 'latest'

// --- App Settings ---
param jwtSecret = '' // ⚠️ Provide via CLI
param jwtExpiresIn = '1h'
param refreshTokenExpiresIn = '7d'

// Azure OpenAI
param azureOpenAiEndpoint = ''
param azureOpenAiApiKey = '' // ⚠️ Provide via CLI
param azureOpenAiModels = ''
param azureOpenAiTimeoutMs = '120000'

// Azure Document Intelligence
param azureDocIntelEndpoint = ''
param azureDocIntelKey = '' // ⚠️ Provide via CLI

// Anthropic (optional)
param anthropicEndpoint = ''
param anthropicApiKey = '' // ⚠️ Provide via CLI
param anthropicModels = ''

// Entra ID
param entraClientId = ''
param entraClientSecret = '' // ⚠️ Provide via CLI
param entraTenantId = ''
param entraRedirectUri = ''

// Upload
param maxUploadSizeMb = '20'

// Seed admin
param seedAdminEmail = ''
param seedAdminPassword = '' // ⚠️ Provide via CLI
param seedAdminName = 'Admin'
