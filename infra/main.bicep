// =============================================================================
// Contract AI Review — Main Bicep Template
// =============================================================================
// Deploys to an EXISTING resource group with an EXISTING ACR and Storage Account.
// Only creates App Service (Plan + Web App) and PostgreSQL Flexible Server.
//
// Usage:
//   az deployment group create \
//     --resource-group rg-d-app-10009620 \
//     --template-file infra/main.bicep \
//     --parameters infra/main.bicepparam
// =============================================================================

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Location for new resources')
param location string = resourceGroup().location

// --- Existing resources ---
@description('Name of the EXISTING Azure Container Registry')
param acrName string

// --- PostgreSQL (new) ---
@description('Name for the new PostgreSQL Flexible Server')
param pgServerName string

@description('PostgreSQL administrator login')
param pgAdminLogin string = 'pgadmin'

@secure()
@description('PostgreSQL administrator password')
param pgAdminPassword string

@description('PostgreSQL database name')
param pgDatabaseName string = 'contract_ai'

@description('PostgreSQL SKU name')
param pgSkuName string = 'Standard_B1ms'

@description('PostgreSQL SKU tier')
param pgSkuTier string = 'Burstable'

@description('PostgreSQL storage size in GB')
param pgStorageSizeGB int = 32

// --- App Service (new) ---
@description('Name for the new App Service Plan')
param planName string

@description('Name for the new Web App')
param appName string

@description('App Service Plan SKU')
param appServiceSku string = 'B1'

@description('Docker image name (without registry prefix)')
param imageName string = 'contract-ai-review'

@description('Docker image tag')
param imageTag string = 'latest'

// --- App-level settings ---
@secure()
@description('JWT secret for authentication')
param jwtSecret string

@description('JWT token expiration')
param jwtExpiresIn string = '1h'

@description('Refresh token expiration')
param refreshTokenExpiresIn string = '7d'

@description('Azure OpenAI endpoint')
param azureOpenAiEndpoint string = ''

@secure()
@description('Azure OpenAI API key')
param azureOpenAiApiKey string = ''

@description('Azure OpenAI models (comma-separated)')
param azureOpenAiModels string = ''

@description('Azure OpenAI timeout in milliseconds')
param azureOpenAiTimeoutMs string = '120000'

@description('Azure Document Intelligence endpoint')
param azureDocIntelEndpoint string = ''

@secure()
@description('Azure Document Intelligence key')
param azureDocIntelKey string = ''

@description('Anthropic API endpoint')
param anthropicEndpoint string = ''

@secure()
@description('Anthropic API key')
param anthropicApiKey string = ''

@description('Anthropic models (comma-separated)')
param anthropicModels string = ''

@description('Entra ID client ID')
param entraClientId string = ''

@secure()
@description('Entra ID client secret')
param entraClientSecret string = ''

@description('Entra ID tenant ID')
param entraTenantId string = ''

@description('Entra ID redirect URI')
param entraRedirectUri string = ''

@description('Max upload file size in MB')
param maxUploadSizeMb string = '20'

@description('Seed admin email')
param seedAdminEmail string = ''

@secure()
@description('Seed admin password')
param seedAdminPassword string = ''

@description('Seed admin name')
param seedAdminName string = 'Admin'

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

var tags = {
  project: 'contract-ai-review'
  managedBy: 'bicep'
}

// ---------------------------------------------------------------------------
// References to existing resources
// ---------------------------------------------------------------------------

resource existingAcr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

// ---------------------------------------------------------------------------
// New resources
// ---------------------------------------------------------------------------

module postgresql 'modules/postgresql.bicep' = {
  name: 'postgresql'
  params: {
    name: pgServerName
    location: location
    tags: tags
    administratorLogin: pgAdminLogin
    administratorLoginPassword: pgAdminPassword
    databaseName: pgDatabaseName
    skuName: pgSkuName
    skuTier: pgSkuTier
    storageSizeGB: pgStorageSizeGB
  }
}

module appService 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    planName: planName
    appName: appName
    location: location
    tags: tags
    skuName: appServiceSku
    acrLoginServer: existingAcr.properties.loginServer
    imageName: imageName
    imageTag: imageTag
    appSettings: [
      { name: 'NODE_ENV', value: 'production' }
      { name: 'PORT', value: '3001' }
      { name: 'DATABASE_URL', value: 'postgresql://${pgAdminLogin}:${pgAdminPassword}@${postgresql.outputs.fqdn}:5432/${pgDatabaseName}?sslmode=require' }
      { name: 'JWT_SECRET', value: jwtSecret }
      { name: 'JWT_EXPIRES_IN', value: jwtExpiresIn }
      { name: 'REFRESH_TOKEN_EXPIRES_IN', value: refreshTokenExpiresIn }
      { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
      { name: 'AZURE_OPENAI_API_KEY', value: azureOpenAiApiKey }
      { name: 'AZURE_OPENAI_MODELS', value: azureOpenAiModels }
      { name: 'AZURE_OPENAI_TIMEOUT_MS', value: azureOpenAiTimeoutMs }
      { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', value: azureDocIntelEndpoint }
      { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', value: azureDocIntelKey }
      { name: 'ANTHROPIC_ENDPOINT', value: anthropicEndpoint }
      { name: 'ANTHROPIC_API_KEY', value: anthropicApiKey }
      { name: 'ANTHROPIC_MODELS', value: anthropicModels }
      { name: 'ENTRA_CLIENT_ID', value: entraClientId }
      { name: 'ENTRA_CLIENT_SECRET', value: entraClientSecret }
      { name: 'ENTRA_TENANT_ID', value: entraTenantId }
      { name: 'ENTRA_REDIRECT_URI', value: entraRedirectUri }
      { name: 'FILE_UPLOAD_DIR', value: '/home/uploads' }
      { name: 'MAX_UPLOAD_SIZE_MB', value: maxUploadSizeMb }
      { name: 'CORS_ORIGIN', value: 'https://${appName}.azurewebsites.net' }
      { name: 'SEED_ADMIN_EMAIL', value: seedAdminEmail }
      { name: 'SEED_ADMIN_PASSWORD', value: seedAdminPassword }
      { name: 'SEED_ADMIN_NAME', value: seedAdminName }
    ]
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

output appUrl string = appService.outputs.url
output appName string = appService.outputs.name
output acrLoginServer string = existingAcr.properties.loginServer
output pgServerFqdn string = postgresql.outputs.fqdn
