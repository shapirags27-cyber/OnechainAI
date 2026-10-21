import type {
  ChainProvider,
  NetworkDescriptor
} from './types'

const providers: ChainProvider[] = []

export function registerProvider(
  provider: ChainProvider
) {
  providers.push(provider)
}

export function getProvider(
  network: NetworkDescriptor,
  providerId?: string
) {
  return (
    providers.find(provider =>
      providerId
        ? provider.id === providerId &&
          provider.supports(network)
        : provider.supports(network)
    ) || null
  )
}

export function listProviders() {
  return [...providers]
}

export function getProviderForOperation(
  network: NetworkDescriptor,
  operation: string,
  providerId?: string
) {
  return (
    providers.find(provider =>
      (!providerId || provider.id === providerId) &&
      provider.supports(network) &&
      provider.supportsOperation(operation)
    ) || null
  )
}

export function discoverProviders(
  network?: NetworkDescriptor,
  operation?: string
) {
  return providers
    .filter(provider => {
      if (network && !provider.supports(network)) {
        return false
      }

      if (
        operation &&
        !provider.supportsOperation(operation)
      ) {
        return false
      }

      return true
    })
    .map(provider => ({
      id: provider.id,
      type: provider.type,
      capabilities: provider.capabilities
    }))
}
