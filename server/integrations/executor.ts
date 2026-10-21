import type {
  IntegrationAdapter,
  IntegrationTool,
  ExecutionContext,
  ToolExecutionResult
} from './types'

import {
  getProviderForOperation
} from '../providers/registry'

export type ToolInvocation = {
  integration: string
  tool: string
  arguments: Record<string, unknown>
}

export function findIntegrationTool(
  adapter: IntegrationAdapter,
  toolName: string
): IntegrationTool | null {
  return (
    adapter.tools.find(
      tool => tool.name === toolName
    ) || null
  )
}

export function validateToolInvocation(
  adapter: IntegrationAdapter,
  invocation: ToolInvocation
) {
  if (
    invocation.integration.trim().toLowerCase() !==
    adapter.handle.trim().toLowerCase()
  ) {
    return {
      ok: false as const,
      error: 'Integration mismatch'
    }
  }

  const tool = findIntegrationTool(
    adapter,
    invocation.tool
  )

  if (!tool) {
    return {
      ok: false as const,
      error:
        `Tool "${invocation.tool}" is not available ` +
        `for ${adapter.name}`
    }
  }

  return {
    ok: true as const,
    tool
  }
}

export async function executeToolInvocation(
  adapter: IntegrationAdapter,
  tool: IntegrationTool,
  invocation: ToolInvocation,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  if (tool.requiresVerification) {
    return {
      ok: false,
      error:
        'Phorva verification is required before this tool can execute.',
      verificationRequired: true
    }
  }

  if (context.network) {
    const operation =
      tool.providerRequest?.operation || tool.name

    const provider =
      getProviderForOperation(
        context.network,
        operation,
        context.provider?.id
      )

    if (!provider) {
      return {
        ok: false,
        error:
          `No provider supports "${operation}" ` +
          `for the requested network.`
      }
    }

    const providerRequest =
      tool.providerRequest

    const providerResult =
      await provider.request(
        context.network,
        {
          method:
            providerRequest?.operation ||
            tool.name,
          params:
            providerRequest?.params.map(
              key => invocation.arguments[key]
            ) ||
            Object.values(
              invocation.arguments
            )
        }
      )

    if (!providerResult.ok) {
      return {
        ok: false,
        error:
          providerResult.error ||
          'Provider request failed'
      }
    }

    return {
      ok: true,
      data: providerResult.result
    }
  }

  if (!adapter.execute) {
    return {
      ok: false,
      error:
        `No execution adapter is registered for ${adapter.name}.`
    }
  }

  return adapter.execute(
    tool,
    invocation.arguments,
    context
  )
}
