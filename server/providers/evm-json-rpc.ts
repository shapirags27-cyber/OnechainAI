import { getNetworkConfig } from './networks'
import type {
  ChainProvider,
  NetworkDescriptor,
  ProviderRequest,
  ProviderResponse
} from './types'

function getRpcUrl(network: NetworkDescriptor) {
  let urls: Record<string, string>

  try {
    urls = JSON.parse(process.env.CHAIN_RPC_URLS_JSON || '{}')
  } catch {
    return null
  }

  const key = network.network
    ? `${network.chain}:${network.network}`
    : network.chain

  return urls[key] || urls[network.chain] || null
}

async function rpcRequest(
  url: string,
  method: string,
  params: unknown[]
): Promise<ProviderResponse> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      }),
      signal: AbortSignal.timeout(12000)
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `Provider HTTP error: ${response.status}`
      }
    }

    const body = await response.json() as {
      result?: unknown
      error?: { message?: string }
    }

    if (body.error) {
      return {
        ok: false,
        error: body.error.message || 'Provider request failed'
      }
    }

    return { ok: true, result: body.result }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Provider request failed'
    }
  }
}

export const evmJsonRpcProvider: ChainProvider = {
  id: 'evm-json-rpc',
  type: 'json-rpc',

  capabilities: [
    {
      operation: 'get_balance',
      description: 'Read a native asset balance.'
    },
    {
      operation: 'get_token_balance',
      description: 'Read an ERC-20 token balance and token decimals.'
    }
  ],

  supports(network) {
    return (
      network.namespace === 'evm' &&
      Boolean(getNetworkConfig(network)) &&
      Boolean(getRpcUrl(network))
    )
  },

  supportsOperation(operation) {
    return this.capabilities.some(
      capability => capability.operation === operation
    )
  },

  async request(
    network: NetworkDescriptor,
    request: ProviderRequest
  ): Promise<ProviderResponse> {
    const url = getRpcUrl(network)

    if (!url) {
      return {
        ok: false,
        error: `No RPC provider configured for ${network.chain}`
      }
    }

    const networkConfig = getNetworkConfig(network)
    const expectedChainId = networkConfig?.chainId.toLowerCase()

    if (!expectedChainId || network.namespace !== 'evm') {
      return {
        ok: false,
        error: `Unsupported network: ${network.chain}:${network.network || 'unspecified'}`
      }
    }

    const chainResult = await rpcRequest(url, 'eth_chainId', [])

    if (
      !chainResult.ok ||
      typeof chainResult.result !== 'string' ||
      chainResult.result.toLowerCase() !== expectedChainId
    ) {
      return {
        ok: false,
        error: `RPC chain ID mismatch for ${network.chain}. Read stopped.`
      }
    }

    if (request.method === 'get_balance') {
      const address = request.params[0]

      if (
        typeof address !== 'string' ||
        !/^0x[a-fA-F0-9]{40}$/.test(address)
      ) {
        return {
          ok: false,
          error: 'A valid EVM wallet address is required.'
        }
      }

      return rpcRequest(url, 'eth_getBalance', [address, 'latest'])
    }

    if (request.method === 'get_token_balance') {
      const walletAddress = request.params[0]
      const tokenAddress = request.params[1]

      if (
        typeof walletAddress !== 'string' ||
        !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)
      ) {
        return {
          ok: false,
          error: 'A valid EVM wallet address is required.'
        }
      }

      if (
        typeof tokenAddress !== 'string' ||
        !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)
      ) {
        return {
          ok: false,
          error: 'A valid ERC-20 token contract address is required.'
        }
      }

      const encodedAddress = walletAddress
        .slice(2)
        .toLowerCase()
        .padStart(64, '0')

      const [balanceResult, decimalsResult] = await Promise.all([
        rpcRequest(url, 'eth_call', [
          {
            to: tokenAddress,
            data: `0x70a08231${encodedAddress}`
          },
          'latest'
        ]),
        rpcRequest(url, 'eth_call', [
          {
            to: tokenAddress,
            data: '0x313ce567'
          },
          'latest'
        ])
      ])

      if (
        !balanceResult.ok ||
        typeof balanceResult.result !== 'string' ||
        !/^0x[0-9a-f]+$/i.test(balanceResult.result)
      ) {
        return {
          ok: false,
          error: 'Could not read the ERC-20 balance from the RPC provider.'
        }
      }

      if (
        !decimalsResult.ok ||
        typeof decimalsResult.result !== 'string' ||
        !/^0x[0-9a-f]+$/i.test(decimalsResult.result)
      ) {
        return {
          ok: false,
          error: 'Could not read token decimals from the RPC provider.'
        }
      }

      const decimalsBigInt = BigInt(decimalsResult.result)

      if (decimalsBigInt > 255n) {
        return {
          ok: false,
          error: 'The token returned invalid decimals.'
        }
      }

      return {
        ok: true,
        result: {
          balance: balanceResult.result,
          decimals: Number(decimalsBigInt)
        }
      }
    }

    return {
      ok: false,
      error: `Unsupported provider operation: ${request.method}`
    }
  }
}
