import { Command } from 'commander'
import * as brc20 from '../brc20'
import * as utxo from '../utxo'
import { Wallet } from './wallet'

export const brc20Send = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption('-amt, --amount <amount>', 'amount you want to send')
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .requiredOption('-tick', '--ticker <ticker>', 'brc20 ticker to send')
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl brc20 send -p regtest -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv -tick toyl -amt 1000 -feeRate 2
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer

    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } =
      await utxo.accountUtxos({ account, provider })

    console.log(
      await brc20.send({
        gatheredUtxos: {
          utxos: accountSpendableTotalUtxos,
          totalAmount: accountSpendableTotalBalance,
        },
        ticker: options.ticker,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
        amount: options.amount,
      })
    )
  })
