export type IntegrationTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  access: 'read' | 'write'
  requiresVerification: boolean

  providerRequest?: {
    operation: string
    params: string[]
  }
}

export type ExecutionContext = {
  userId: string

  network?: {
    namespace?: string
    chain?: string
    network?: string
  }

  provider?: {
    id?: string
    type?: string
  }

  selectedProvider?: {
    id: string
    type: string
  }
}

export type ToolExecutionResult = {
  ok: boolean
  data?: unknown
  error?: string

  verificationRequired?: boolean
  requiresClientExecution?: boolean
}

export type IntegrationAdapter = {
  name: string
  handle: string
  tools: IntegrationTool[]

  execute?: (
    tool: IntegrationTool,
    arguments_: Record<string, unknown>,
    context: ExecutionContext
  ) => Promise<ToolExecutionResult>
}
