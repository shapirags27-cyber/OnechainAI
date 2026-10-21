import type { IntegrationAdapter } from './types'

export type AppConnection = {
  handle: string
  name: string
  authorized: boolean
  status: string
  connectedAt?: string
}

export function getConnection(
  connections: Record<string, AppConnection>,
  handle: string
) {
  return connections[handle.trim().toLowerCase()] || null
}

export function isAuthorized(
  connections: Record<string, AppConnection>,
  handle: string
) {
  const connection = getConnection(
    connections,
    handle
  )

  return (
    connection?.authorized === true &&
    connection.status === 'connected'
  )
}

export function getAvailableTools(
  connections: Record<string, AppConnection>,
  adapter: IntegrationAdapter
) {
  if (!isAuthorized(connections, adapter.handle)) {
    return []
  }

  return adapter.tools
}
