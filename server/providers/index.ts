import {
  registerProvider,
  listProviders,
  getProviderForOperation,
  discoverProviders
} from './registry'

import {
  evmJsonRpcProvider
} from './evm-json-rpc'

export {
  registerProvider,
  listProviders,
  getProviderForOperation,
  discoverProviders
}

export function initializeProviders() {
  registerProvider(
    evmJsonRpcProvider
  )
}
