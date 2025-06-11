import { Command } from 'commander'
import * as utxo from '@oyl/sdk-core'
import { Wallet } from './wallet'

export const accountUtxosToSpend = new Command('accountUtxos')
  .description('Returns available utxos to spend')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  /* @dev example call
    oyl utxo accountUtxos -p regtest
  */
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })

    console.log(
      await utxo.accountUtxos({
        account: wallet.account,
        provider: wallet.provider,
      })
    )
  })

export const accountAvailableBalance = new Command('balance')
  .description('Returns amount of sats available to spend')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  /* @dev example call
    oyl utxo balance -p regtest
  */
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    console.log(
      await utxo.accountBalance({
        account: wallet.account,
        provider: wallet.provider,
      })
    )
  })

export const addressUtxosToSpend = new Command('addressUtxos')
  .description('Returns available utxos to spend')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption(
    '-a, --address <address>',
    'address you want to get utxos for'
  )
  /* @dev example call
    oyl utxo addressUtxos -a bcrt1q54zh4xfz2jkqah8nqvp2ltl9mvrmf6s69h6au0 -p alkanes
  */
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })

    await utxo.addressUtxos({
      address: options.address,
      provider: wallet.provider,
    })
  })

export const genericUtxoCommand = new Command('generic')
  .description('Generic command to call any utxo method')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption(
    '-m, --method <method>',
    'Method name to call (e.g. accountBalance, addressUtxos, etc.)'
  )
  .requiredOption(
    '-a, --args <args>',
    'JSON string containing method arguments'
  )
  /* @dev example calls:
    oyl utxo generic -p regtest -m accountBalance -a '{"account": {...}}'
    oyl utxo generic -p regtest -m addressUtxos -a '{"address": "bc1..."}'
  */
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const args = JSON.parse(options.args)

    // Add provider to args if not present
    if (!args.provider) {
      args.provider = wallet.provider
    }

    // Add account to args if not present and method requires it
    if (!args.account && ['accountBalance', 'accountUtxos'].includes(options.method)) {
      args.account = wallet.account
    }

    const methodName = options.method as keyof typeof utxo
    const method = utxo[methodName] as Function
    
    if (typeof method !== 'function') {
      throw new Error(`Method ${options.method} is not a function`)
    }

    console.log(await method(args))
  })

export const getSpendableUtxoSetCommand = new Command('getSpendableUtxoSet')
  .description('Returns a set of spendable UTXOs for a given address and amount')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption(
    '-a, --address <address>',
    'Address to get spendable UTXOs for'
  )
  .requiredOption(
    '-m, --amount <amount>',
    'Amount in satoshis needed'
  )
  .option(
    '-f, --fee <fee>',
    'Estimated fee in satoshis'
  )
  .option(
    '-t, --threshold <threshold>',
    'Minimum satoshi threshold for UTXOs (default: 1000)',
    '1000'
  )
  .option(
    '-s, --sort <sort>',
    'Sort UTXOs by amount (greatest/least)',
    'greatest'
  )
  /* @dev example call
    oyl utxo getSpendableUtxoSet -p regtest -a bcrt1q54zh4xfz2jkqah8nqvp2ltl9mvrmf6s69h6au0 -m 10000 -f 546 -t 546 -s greatest
  */
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })

    console.log(
      await utxo.getSpendableUtxoSet({
        address: options.address,
        amount: parseInt(options.amount),
        estimatedFee: parseInt(options.fee),
        satThreshold: parseInt(options.threshold),
        sortUtxosGreatestToLeast: options.sort === 'greatest',
        provider: wallet.provider,
      })
    )
  })
