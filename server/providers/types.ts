export type NetworkDescriptor = {
  namespace: string
  chain: string
  network?: string
}

export type ProviderRequest = {
  method: string
  params: unknown[]
}

export type ProviderResponse = {
  ok: boolean
  result?: unknown
  error?: string
}

export type ProviderCapability = {
  operation: string
  description: string
}

export type ChainProvider = {
  id: string
  type: string

  capabilities: ProviderCapability[]

  supports(
    network: NetworkDescriptor
  ): boolean

  supportsOperation(
    operation: string
  ): boolean

  request(
    network: NetworkDescriptor,
    request: ProviderRequest
  ): Promise<ProviderResponse>
}
