import type { ExecutionPlan } from './execution-plan'
import type { IntegrationAdapter } from './integrations/types'
import { findIntegrationTool } from './integrations/executor'
import { discoverIntegrationTools } from './integrations/registry'
import { isAuthorized } from './integrations/connection-manager'

export type ValidatedExecutionPlan = ExecutionPlan & {
  integration: string | null
  toolAccess: 'read' | 'write' | null
  requiresAuthorization: boolean
  authorized: boolean
  authorizationReason: string | null
  requiresVerification: boolean
}

export function validateExecutionPlan(
  plan: ExecutionPlan,
  adapter: IntegrationAdapter | null,
  connections: Record<string, unknown> = {}
): ValidatedExecutionPlan {
  if (!plan.provider) {
    if (!plan.operation) {
      return {
        ...plan,
        integration: null,
        toolAccess: null,
        requiresAuthorization: false,
        authorized: false,
        authorizationReason: null,
        requiresVerification: false
      }
    }

    const discovered = discoverIntegrationTools(plan.operation)

    if (discovered.length === 0) {
      return {
        ...plan,
        integration: null,
        tool: null,
        toolAccess: null,
        requiresAuthorization: false,
        authorized: false,
        authorizationReason: null,
        requiresVerification: false
      }
    }

    if (discovered.length > 1) {
      return {
        ...plan,
        integration: null,
        tool: null,
        toolAccess: null,
        requiresAuthorization: true,
        authorized: false,
        authorizationReason:
          'Multiple integrations support this operation and require provider selection.',
        requiresVerification: false
      }
    }

    const match = discovered[0]
    const authorized = isAuthorized(connections, match.integration)

    return {
      ...plan,
      provider: match.integration,
      providerMode: 'discovery',
      tool: match.tool,
      integration: match.integration,
      toolAccess: match.access,
      requiresAuthorization: true,
      authorized,
      authorizationReason: authorized
        ? null
        : `${match.name} authorization is required.`,
      requiresVerification:
        match.requiresVerification === true ||
        match.access === 'write'
    }
  }

  if (!adapter) {
    return {
      ...plan,
      tool: null,
      integration: plan.provider,
      toolAccess: null,
      requiresAuthorization: true,
      authorized: false,
      authorizationReason:
        `Integration ${plan.provider} is not available for execution.`,
      requiresVerification: false
    }
  }

  if (!plan.tool) {
    const authorized = isAuthorized(connections, adapter.handle)

    return {
      ...plan,
      integration: adapter.handle,
      toolAccess: null,
      requiresAuthorization: true,
      authorized,
      authorizationReason: authorized
        ? null
        : `${adapter.name} authorization is required.`,
      requiresVerification: false
    }
  }

  const tool = findIntegrationTool(adapter, plan.tool)

  if (!tool) {
    return {
      ...plan,
      tool: null,
      integration: adapter.handle,
      toolAccess: null,
      requiresAuthorization: true,
      authorized: false,
      authorizationReason:
        `Tool "${plan.tool}" is not available for ${adapter.name}.`,
      requiresVerification: false
    }
  }

  const authorized = isAuthorized(connections, adapter.handle)

  return {
    ...plan,
    provider: adapter.handle,
    integration: adapter.handle,
    toolAccess: tool.access,
    requiresAuthorization: true,
    authorized,
    authorizationReason: authorized
      ? null
      : `${adapter.name} authorization is required.`,
    requiresVerification:
      tool.requiresVerification === true ||
      tool.access === 'write'
  }
}
