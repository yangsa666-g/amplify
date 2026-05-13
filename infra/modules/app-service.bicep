// =============================================================================
// Contract AI Review — Azure App Service (Plan + Web App)
// =============================================================================

@description('Name of the App Service Plan')
param planName string

@description('Name of the Web App')
param appName string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags to apply')
param tags object = {}

@description('SKU name for the App Service Plan')
param skuName string = 'B1'

@description('ACR login server (e.g., myregistry.azurecr.io)')
param acrLoginServer string

@description('Docker image name (without registry prefix)')
param imageName string = 'contract-ai-review'

@description('Docker image tag')
param imageTag string = 'latest'

@description('Application settings (env vars) for the Web App')
param appSettings array = []

// ---------------------------------------------------------------------------
// App Service Plan (Linux)
// ---------------------------------------------------------------------------
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true // required for Linux
  }
}

// ---------------------------------------------------------------------------
// Web App (Container)
// ---------------------------------------------------------------------------
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  tags: tags
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/${imageName}:${imageTag}'
      alwaysOn: true
      httpLoggingEnabled: true
      appSettings: concat(appSettings, [
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'true'
        }
        {
          name: 'DOCKER_ENABLE_CI'
          value: 'false'
        }
        {
          name: 'WEBSITES_PORT'
          value: '80'
        }
      ])
    }
    httpsOnly: true
  }
}

output id string = webApp.id
output name string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName
output url string = 'https://${webApp.properties.defaultHostName}'
