import { Command } from 'commander'
import * as collectible from '@oyl/sdk-collectible'
import * as utxo from '@oyl/sdk-core'
import { Wallet } from './wallet'

export const collectibleSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .requiredOption(
    '-inscId, --inscriptionId <inscriptionId>',
    'inscription to send'
  )
  .requiredOption(
    '-inscAdd, --inscriptionAddress <inscriptionAddress>',
    'current holder of inscription to send'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl collectible send 
  -p regtest 
  -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv 
  -inscId d0c21b35f27ba6361acd5172fcfafe8f4f96d424c80c00b5793290387bcbcf44i0
  -inscAdd bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk
  -feeRate 2
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const gatheredUtxos = await utxo.accountUtxos({ account, provider })
    console.log(
      await collectible.send({
        gatheredUtxos: {
          utxos: gatheredUtxos.accounts['nativeSegwit'].spendableUtxos,
          totalAmount:
            gatheredUtxos.accounts['nativeSegwit'].spendableTotalBalance,
        },
        inscriptionId: options.inscriptionId,
        inscriptionAddress: options.inscriptionAddress,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
      })
    )
  })
