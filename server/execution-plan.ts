export type ProviderMode =
  | 'explicit'
  | 'discovery'
  | 'none'

export type ExecutionPlan = {
  intent: string
  operation: string | null
  provider: string | null
  providerMode: ProviderMode
  tool: string | null
  arguments: Record<string, unknown>
  requiresAuthorization: boolean
  requiresVerification: boolean
}

export function createEmptyExecutionPlan(): ExecutionPlan {
  return {
    intent: '',
    operation: null,
    provider: null,
    providerMode: 'none',
    tool: null,
    arguments: {},
    requiresAuthorization: false,
    requiresVerification: false
  }
}
