import type { NetworkDescriptor } from './types'

export type NetworkConfig = NetworkDescriptor & {
  chainId: string
  asset: string
}

const defaultNetworks: NetworkConfig[] = [
  { namespace: 'evm', chain: 'ethereum', network: 'mainnet', chainId: '0x1', asset: 'ETH' },
  { namespace: 'evm', chain: 'base', network: 'mainnet', chainId: '0x2105', asset: 'ETH' },
  { namespace: 'evm', chain: 'arbitrum', network: 'mainnet', chainId: '0xa4b1', asset: 'ETH' },
  { namespace: 'evm', chain: 'polygon', network: 'mainnet', chainId: '0x89', asset: 'POL' }
]

function configuredNetworks(): NetworkConfig[] {
  try {
    const raw = process.env.CHAIN_NETWORKS_JSON
    if (!raw) return defaultNetworks

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('CHAIN_NETWORKS_JSON must be a JSON array')
    }

    const valid = parsed.filter((item): item is NetworkConfig =>
      item &&
      typeof item.namespace === 'string' &&
      typeof item.chain === 'string' &&
      typeof item.network === 'string' &&
      typeof item.chainId === 'string' &&
      /^0x[0-9a-f]+$/i.test(item.chainId) &&
      typeof item.asset === 'string'
    )

    if (valid.length !== parsed.length) {
      throw new Error('Every network needs namespace, chain, network, chainId and asset')
    }

    return valid
  } catch (error) {
    throw new Error(
      'Invalid CHAIN_NETWORKS_JSON: ' +
      (error instanceof Error ? error.message : 'invalid configuration')
    )
  }
}

export function listNetworks(): NetworkConfig[] {
  return configuredNetworks().map(network => ({ ...network }))
}

export function resolveNetworkByChainId(
  chainId: string
): NetworkConfig | null {
  const normalized = chainId.trim().toLowerCase()
  return configuredNetworks().find(
    network => network.chainId.toLowerCase() === normalized
  ) || null
}

export function getNetworkConfig(
  descriptor: NetworkDescriptor
): NetworkConfig | null {
  return configuredNetworks().find(network =>
    network.namespace === descriptor.namespace &&
    network.chain === descriptor.chain &&
    network.network === descriptor.network
  ) || null
}
