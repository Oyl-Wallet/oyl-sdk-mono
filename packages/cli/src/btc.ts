import { Command } from 'commander'
import * as btc from '../btc'
import * as utxo from '../utxo'
import { Wallet } from './wallet'

export const btcSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption('-amt, --amount <amount>', 'amount you want to send')
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl btc send -p regtest -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv -amt 1000 -feeRate 2
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const { accountSpendableTotalUtxos } = await utxo.accountUtxos({
      account,
      provider,
    })

    console.log(
      await btc.send({
        utxos: accountSpendableTotalUtxos,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
        amount: options.amount,
      })
    )
  })
