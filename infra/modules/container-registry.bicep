// =============================================================================
// Contract AI Review — Azure Container Registry
// =============================================================================

@description('Name of the container registry')
param name string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags to apply')
param tags object = {}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

output id string = acr.id
output name string = acr.name
output loginServer string = acr.properties.loginServer
