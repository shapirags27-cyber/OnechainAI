export type ActionAccess = 'read' | 'write'

export type ActionDefinition = {
  id: string
  category: string
  name: string
  description: string
  access: ActionAccess
  requiresVerification: boolean
  implementation: 'existing_partial' | 'catalog_only'
  integrationRequired: string[]
  aliases: string[]
}

const read = (
  id: string,
  category: string,
  name: string,
  description: string,
  integrationRequired: string[],
  aliases: string[] = [],
  implementation: ActionDefinition['implementation'] = 'catalog_only'
): ActionDefinition => ({
  id, category, name, description,
  access: 'read',
  requiresVerification: false,
  implementation,
  integrationRequired,
  aliases
})

const write = (
  id: string,
  category: string,
  name: string,
  description: string,
  integrationRequired: string[],
  aliases: string[] = []
): ActionDefinition => ({
  id, category, name, description,
  access: 'write',
  requiresVerification: true,
  implementation: 'catalog_only',
  integrationRequired,
  aliases
})

export const ACTION_CATALOG: ActionDefinition[] = [
  // Wallet and portfolio
  read('wallet.accounts', 'wallet', 'List wallet accounts',
    'Discover accounts from a connected wallet.', ['wallet'], ['accounts', 'my wallets']),
  read('wallet.native_balance', 'wallet', 'Read native balance',
    'Read the native asset balance for an address on a supported network.',
    ['wallet', 'evm-json-rpc'], ['balance', 'eth balance', 'native balance'], 'existing_partial'),
  read('wallet.token_balance', 'wallet', 'Read token balance',
    'Read an ERC-20 token balance for a wallet.', ['evm-json-rpc'], ['token balance', 'usdc balance']),
  read('wallet.portfolio', 'wallet', 'View portfolio',
    'Aggregate supported wallet assets and balances.', ['wallet', 'token data'], ['portfolio', 'my assets']),
  read('wallet.transaction_history', 'wallet', 'View transaction history',
    'Retrieve historical transactions for an address.', ['indexer or explorer API'], ['history', 'transactions']),
  read('wallet.token_allowance', 'wallet', 'Read token allowance',
    'Check how much a spender is approved to use.', ['evm-json-rpc'], ['allowance', 'approval status']),
  write('wallet.transfer', 'wallet', 'Transfer tokens',
    'Prepare a native-asset or token transfer for verified wallet signing.',
    ['wallet', 'Phorva', 'chain adapter'], ['send', 'transfer', 'pay']),
  write('wallet.approve_token', 'wallet', 'Approve token spending',
    'Prepare a bounded token allowance for a specified spender.',
    ['wallet', 'Phorva', 'token contract'], ['approve', 'token approval']),
  write('wallet.revoke_allowance', 'wallet', 'Revoke token allowance',
    'Prepare a transaction to reduce or revoke an existing allowance.',
    ['wallet', 'Phorva', 'token contract'], ['revoke approval', 'remove allowance']),
  write('wallet.sign_message', 'wallet', 'Sign a message',
    'Request an explicit wallet signature for a displayed message.',
    ['wallet', 'Phorva'], ['sign message', 'signature']),

  // Market data
  read('market.token_price', 'market', 'Get token price',
    'Retrieve token prices from a configured market-data source.',
    ['market data API'], ['price', 'token price', 'how much is']),
  read('market.token_search', 'market', 'Search tokens',
    'Search for token identity, address and market information.',
    ['token registry or market data API'], ['find token', 'look up token']),
  read('market.gas_estimate', 'market', 'Estimate network fees',
    'Estimate gas requirements and transaction fees.',
    ['chain RPC'], ['gas', 'network fee', 'transaction fee']),
  read('market.protocol_metrics', 'market', 'Inspect protocol metrics',
    'Retrieve supported protocol liquidity, volume and rate data.',
    ['protocol API or indexer'], ['tvl', 'volume', 'yield', 'apy']),

  // Swaps and routing
  read('swap.quote', 'swaps', 'Quote a swap',
    'Find a proposed token swap route and estimated output.',
    ['DEX aggregator or protocol API'], ['quote', 'swap price']),
  write('swap.execute', 'swaps', 'Execute a token swap',
    'Prepare a swap with explicit assets, amount, recipient, slippage and expiry.',
    ['wallet', 'Phorva', 'DEX router or aggregator'], ['swap', 'exchange tokens']),
  write('swap.limit_order', 'swaps', 'Place a limit order',
    'Create a supported limit order with explicit price and expiry.',
    ['wallet', 'Phorva', 'order protocol'], ['limit order']),

  // DeFi
  read('defi.position', 'defi', 'Inspect DeFi positions',
    'Read supported lending, staking and liquidity positions.',
    ['protocol adapters or indexer'], ['positions', 'my defi']),
  read('defi.lending_rates', 'defi', 'Compare lending rates',
    'Compare supported supply and borrowing rates.',
    ['protocol APIs or indexer'], ['lending rates', 'borrow rates']),
  write('defi.supply', 'defi', 'Supply assets',
    'Prepare a lending-market supply transaction.',
    ['wallet', 'Phorva', 'lending protocol'], ['supply', 'lend', 'deposit into lending']),
  write('defi.withdraw', 'defi', 'Withdraw supplied assets',
    'Prepare a withdrawal from a supported lending position.',
    ['wallet', 'Phorva', 'lending protocol'], ['withdraw', 'redeem']),
  write('defi.borrow', 'defi', 'Borrow assets',
    'Prepare a borrow request subject to collateral and risk checks.',
    ['wallet', 'Phorva', 'lending protocol'], ['borrow']),
  write('defi.repay', 'defi', 'Repay a loan',
    'Prepare repayment of a supported lending position.',
    ['wallet', 'Phorva', 'lending protocol'], ['repay', 'pay back loan']),
  write('defi.stake', 'defi', 'Stake assets',
    'Prepare staking or delegation on a supported protocol.',
    ['wallet', 'Phorva', 'staking protocol'], ['stake', 'delegate']),
  write('defi.unstake', 'defi', 'Unstake assets',
    'Prepare an unstaking or undelegation transaction.',
    ['wallet', 'Phorva', 'staking protocol'], ['unstake', 'undelegate']),
  write('defi.add_liquidity', 'defi', 'Add liquidity',
    'Prepare a liquidity deposit with explicit pool and token amounts.',
    ['wallet', 'Phorva', 'DEX or pool adapter'], ['add liquidity', 'provide liquidity']),
  write('defi.remove_liquidity', 'defi', 'Remove liquidity',
    'Prepare a liquidity withdrawal from a supported pool.',
    ['wallet', 'Phorva', 'DEX or pool adapter'], ['remove liquidity']),
  write('defi.claim_rewards', 'defi', 'Claim rewards',
    'Prepare a reward claim from a supported protocol.',
    ['wallet', 'Phorva', 'protocol adapter'], ['claim rewards', 'claim yield']),

  // Cross-chain
  read('bridge.quote', 'bridges', 'Quote a bridge',
    'Estimate cross-chain route, fees, timing and expected receipt.',
    ['bridge aggregator API'], ['bridge quote', 'bridge fee']),
  write('bridge.transfer', 'bridges', 'Bridge assets',
    'Prepare a cross-chain transfer with source and destination verification.',
    ['wallet', 'Phorva', 'bridge provider'], ['bridge', 'cross-chain transfer']),

  // Prediction markets
  read('prediction.search_markets', 'prediction_markets', 'Search prediction markets',
    'Search supported markets and inspect their outcomes and prices.',
    ['prediction-market API'], ['prediction market', 'markets', 'market odds']),
  read('prediction.positions', 'prediction_markets', 'View market positions',
    'Read positions and available balances on supported markets.',
    ['prediction-market API'], ['my bets', 'market positions']),
  write('prediction.buy', 'prediction_markets', 'Buy a market position',
    'Prepare a purchase with explicit market, outcome, amount and limit.',
    ['wallet', 'Phorva', 'prediction-market adapter'], ['buy shares', 'bet on']),
  write('prediction.sell', 'prediction_markets', 'Sell a market position',
    'Prepare a sale with explicit market, outcome and amount.',
    ['wallet', 'Phorva', 'prediction-market adapter'], ['sell shares', 'exit position']),
  write('prediction.redeem', 'prediction_markets', 'Redeem a resolved position',
    'Prepare redemption of an eligible resolved market position.',
    ['wallet', 'Phorva', 'prediction-market adapter'], ['redeem winnings', 'redeem shares']),

  // NFTs and gaming
  read('nft.owned', 'nfts', 'View owned NFTs',
    'List NFTs for an address on supported networks.',
    ['NFT indexer'], ['my nfts', 'collectibles']),
  read('nft.collection', 'nfts', 'Inspect an NFT collection',
    'Retrieve collection metadata and available market information.',
    ['NFT marketplace or indexer'], ['NFT collection']),
  write('nft.transfer', 'nfts', 'Transfer an NFT',
    'Prepare an NFT transfer with verified token and recipient details.',
    ['wallet', 'Phorva', 'NFT contract'], ['send NFT']),
  write('nft.marketplace_purchase', 'nfts', 'Purchase an NFT',
    'Prepare a marketplace purchase with explicit item and maximum price.',
    ['wallet', 'Phorva', 'NFT marketplace'], ['buy NFT']),
  read('gaming.assets', 'gaming', 'Inspect gaming assets',
    'Read supported game inventory and on-chain asset ownership.',
    ['game adapter or indexer'], ['game assets', 'inventory']),
  write('gaming.action', 'gaming', 'Perform an on-chain game action',
    'Prepare a supported game contract interaction.',
    ['wallet', 'Phorva', 'game adapter'], ['game action']),

  // Payments, DAOs and contracts
  write('payments.create', 'payments', 'Make a payment',
    'Prepare a payment with explicit recipient, asset, amount and network.',
    ['wallet', 'Phorva', 'payment adapter'], ['pay', 'checkout']),
  read('dao.proposal', 'dao', 'Inspect DAO proposals',
    'Read proposal details, voting state and execution status.',
    ['DAO governance adapter'], ['DAO proposal', 'governance']),
  write('dao.vote', 'dao', 'Vote on a DAO proposal',
    'Prepare a vote for a specific proposal and voting choice.',
    ['wallet', 'Phorva', 'DAO governance adapter'], ['vote']),
  write('dao.treasury_transfer', 'dao', 'Transfer DAO treasury assets',
    'Prepare a treasury action subject to explicit policy limits.',
    ['wallet or multisig', 'Phorva', 'DAO adapter'], ['treasury', 'treasury transfer']),
  read('contract.read', 'contracts', 'Read a smart contract',
    'Call a supported read-only contract method.',
    ['chain RPC', 'verified ABI or method definition'], ['contract read', 'call view function']),
  write('contract.write', 'contracts', 'Call a smart contract',
    'Prepare a contract call with decoded parameters and explicit authorization.',
    ['wallet', 'Phorva', 'verified ABI or method definition'], ['contract interaction']),
  read('security.simulate', 'security', 'Simulate an action',
    'Simulate a supported transaction before authorization or signing.',
    ['simulation provider'], ['simulate', 'preview transaction', 'dry run']),
  read('security.risk_check', 'security', 'Check action risk',
    'Inspect available risk signals for a proposed action.',
    ['risk data providers', 'Phorva'], ['risk check', 'is this safe']),
  read('security.execution_receipt', 'security', 'Inspect execution receipt',
    'Retrieve a supported action verification or execution receipt.',
    ['Phorva'], ['receipt', 'verification result']),
]

export function listActions(category?: string) {
  const normalized = category?.trim().toLowerCase()
  return ACTION_CATALOG.filter(action =>
    !normalized || action.category === normalized
  )
}

export function resolveAction(message: string) {
  const normalized = message.toLowerCase()
  return ACTION_CATALOG
    .map(action => ({
      action,
      score: action.aliases.reduce(
        (score, alias) =>
          normalized.includes(alias.toLowerCase())
            ? Math.max(score, alias.length)
            : score,
        0
      )
    }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.action)
}
