import type {
  IntegrationAdapter,
  IntegrationTool,
  ToolExecutionResult,
  ExecutionContext
} from './types'


async function executeMetaMaskTool(
  tool: IntegrationTool,
  arguments_: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  if (tool.access === 'write') {
    return {
      ok: false,
      error:
        'This wallet action requires client-side wallet execution after Phorva verification.',
      requiresClientExecution: true,
      verificationRequired:
        tool.requiresVerification
    }
  }

  if (tool.name === 'get_accounts') {
    return {
      ok: false,
      error:
        'Wallet account discovery requires the connected wallet client.',
      requiresClientExecution: true
    }
  }

  if (tool.name === 'get_balance') {
    if (!context.network) {
      return {
        ok: false,
        error:
          'A network is required for this balance request.'
      }
    }

    if (
      !context.network ||
      !context.selectedProvider
    ) {
      return {
        ok: false,
        error:
          'A selected provider is required for this operation.'
      }
    }

    return {
      ok: false,
      error:
        'Selected provider execution is not yet attached to this integration.',
      data: {
        operation: 'get_balance',
        arguments: arguments_,
        network: context.network,
        provider: context.selectedProvider
      }
    }
  }

  return {
    ok: false,
    error:
      `No execution implementation exists for tool "${tool.name}".`
  }
}

export const metamaskIntegration: IntegrationAdapter = {
  name: 'MetaMask',
  handle: '@metamask',

  tools: [
    {
      name: 'get_accounts',
      description:
        'Get the accounts available from the connected wallet.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      access: 'read',
      requiresVerification: false
    },

    {
      name: 'get_balance',
      description:
        'Get the balance of a connected wallet account.',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description:
              'Wallet address to inspect.'
          },
          network: {
            type: 'object',
            description:
              'Provider-neutral network descriptor.'
          }
        },
        required: [
          'address',
          'network'
        ],
        additionalProperties: false
      },
      access: 'read',
      requiresVerification: false,
      providerRequest: {
        operation: 'get_balance',
        params: ['address']
      }
    },

    {
      name: 'sign_message',
      description:
        'Request a message signature from the connected wallet.',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description:
              'Message to sign.'
          }
        },
        required: ['message'],
        additionalProperties: false
      },
      access: 'write',
      requiresVerification: true
    },

    {
      name: 'send_transaction',
      description:
        'Prepare a blockchain transaction for wallet signing.',
      inputSchema: {
        type: 'object',
        properties: {
          network: {
            type: 'object',
            description:
              'Provider-neutral network descriptor.'
          },
          to: {
            type: 'string',
            description:
              'Destination account or contract.'
          },
          value: {
            type: 'string',
            description:
              'Native asset amount.'
          },
          data: {
            type: 'string',
            description:
              'Chain-specific transaction payload.'
          }
        },
        required: [
          'network',
          'to'
        ],
        additionalProperties: false
      },
      access: 'write',
      requiresVerification: true
    }
  ],

  execute: async (
    tool,
    arguments_,
    context
  ) =>
    executeMetaMaskTool(
      tool,
      arguments_,
      context
    )
}
