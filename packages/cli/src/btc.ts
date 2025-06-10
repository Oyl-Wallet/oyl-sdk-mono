import { Command } from 'commander'
import * as btc from '@oyl/sdk-btc'
import * as utxo from '@oyl/sdk-core'
import { Wallet } from './wallet'
import { pushPsbt } from '@oyl/sdk-core'

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
    console.log(accountSpendableTotalUtxos)
    const utxos = accountSpendableTotalUtxos
    const toAddress = options.to
    const amount = options.amount
    const feeRate = options.feeRate

    const { fee: actualFee } = await btc.btcSendFee({
      utxos,
      toAddress,
      amount,
      feeRate,
      account,
      provider
    })

    const { psbt: finalPsbt } = await btc.createPsbt({
      utxos,
      toAddress,
      amount,
      fee: actualFee,
      account,
      provider,
    })
  
    const { signedPsbt } = await signer.signAllInputs({
      rawPsbt: finalPsbt,
      finalize: true,
    })

    console.log(signedPsbt)
  
    const result = await pushPsbt({
      psbtBase64: signedPsbt,
      provider,
    })

    console.log(result)
  })
