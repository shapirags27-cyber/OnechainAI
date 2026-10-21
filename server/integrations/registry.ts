import type { IntegrationAdapter } from './types'

export type IntegrationDefinition = {
  name: string
  handle: string
  description: string
  connection: {
    type: string
  }
}

type IntegrationEntry = {
  definition: IntegrationDefinition
  adapter?: IntegrationAdapter
}

const integrations = new Map<string, IntegrationEntry>()

export function registerIntegration(
  adapter: IntegrationAdapter,
  definition?: IntegrationDefinition
) {
  const handle =
    adapter.handle.trim().toLowerCase()

  integrations.set(handle, {
    definition:
      definition || {
        name: adapter.name,
        handle: adapter.handle,
        description: '',
        connection: {
          type: 'provider'
        }
      },
    adapter
  })
}

export function registerIntegrationDefinition(
  definition: IntegrationDefinition
) {
  const handle =
    definition.handle.trim().toLowerCase()

  const existing =
    integrations.get(handle)

  integrations.set(handle, {
    definition,
    adapter: existing?.adapter
  })
}

export function getIntegration(
  handle: string
) {
  return (
    integrations.get(
      handle.trim().toLowerCase()
    )?.adapter || null
  )
}

export function getIntegrationDefinition(
  handle: string
) {
  return (
    integrations.get(
      handle.trim().toLowerCase()
    )?.definition || null
  )
}

export function listIntegrations() {
  return Array.from(
    integrations.values()
  ).map(entry => entry.definition)
}

export function listIntegrationAdapters() {
  return Array.from(
    integrations.values()
  )
    .map(entry => entry.adapter)
    .filter(
      (
        adapter
      ): adapter is IntegrationAdapter =>
        Boolean(adapter)
    )
}

export function discoverIntegrationTools(operation: string) {
  const normalizedOperation = operation.trim().toLowerCase()
  if (!normalizedOperation) return []

  return listIntegrationAdapters().flatMap(adapter =>
    adapter.tools
      .filter(tool =>
        (tool.providerRequest?.operation || tool.name).trim().toLowerCase() ===
        normalizedOperation
      )
      .map(tool => ({
        integration: adapter.handle,
        name: adapter.name,
        tool: tool.name,
        access: tool.access,
        requiresVerification: tool.requiresVerification
      }))
  )
}
