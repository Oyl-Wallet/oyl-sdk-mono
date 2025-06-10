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
