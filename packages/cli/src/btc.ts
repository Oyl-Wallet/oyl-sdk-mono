import { Command } from 'commander'
import { createBtcSendPsbt } from '@oyl/sdk-btc'
import { Wallet } from './wallet'
import { pushPsbt } from '@oyl/sdk-core'
import { getAccountSpendableUtxoSet } from '@oyl/sdk-core'

/**
 * @dev example call 
 * oyl-mono btc send -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv -amt 1000 -feeRate 2 -p regtest 
 */
export const btcSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption('-amt, --amount <amount>', 'amount you want to send')
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const address = options.to
    const amount = options.amount
    const feeRate = options.feeRate

    account.spendStrategy = {
      addressOrder: ['nativeSegwit', 'taproot'],
      utxoSortGreatestToLeast: true,
      changeAddress: 'taproot',
    }

    const { utxos: selectedUtxos } = await getAccountSpendableUtxoSet({
      account,
      amount,
      provider,
    })

    const { psbt} = await createBtcSendPsbt({
      utxos: selectedUtxos,
      toAddress: address,
      amount,
      feeRate,
      account,
      provider
    })
  
    const { signedPsbt } = await signer.signAllInputs({
      rawPsbt: psbt,
      finalize: true,
    })
  
    const result = await pushPsbt({
      psbtBase64: signedPsbt,
      provider,
    })

    console.log(result)
  })
