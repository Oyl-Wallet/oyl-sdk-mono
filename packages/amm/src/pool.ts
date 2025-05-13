import { Provider } from '@oyl-sdk/core'
import * as bitcoin from 'bitcoinjs-lib'
import { Account, Signer } from '@oyl-sdk/core'
import { minimumFee } from '@oyl-sdk/btc'
import { getEstimatedFee } from '@oyl-sdk/core'
import { OylTransactionError } from '@oyl-sdk/core'
import { GatheredUtxos } from '@oyl-sdk/core'
import { getAddressType } from '@oyl-sdk/core'
import { FormattedUtxo } from '@utxo/utxo'
import { findXAmountOfSats } from './utils'

export interface PoolConfig {
  tokenA: string
  tokenB: string
  fee: number
  tickSpacing: number
}

export const createPool = async ({
  config,
  gatheredUtxos,
  account,
  provider,
  feeRate,
  signer,
}: {
  config: PoolConfig
  gatheredUtxos: GatheredUtxos
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const { psbt } = await createPoolPsbt({
      gatheredUtxos,
      account,
      provider,
      feeRate,
    })

    const { signedPsbt } = await signer.signAllInputs({
      rawPsbt: psbt,
      finalize: true,
    })

    const result = await provider.pushPsbt({
      psbtBase64: signedPsbt,
    })

    return result
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const createPoolPsbt = async ({
  gatheredUtxos,
  account,
  provider,
  feeRate,
  fee = 0,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    let finalFee = fee ? fee : calculatedFee

    let psbt = new bitcoin.Psbt({ network: provider.network })

    const wasmDeploySize = 0 // TODO: Calculate actual size
    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      wasmDeploySize + finalFee * 2
    )

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      if (gatheredUtxos.totalAmount < finalFee) {
        gatheredUtxos = findXAmountOfSats(
          originalGatheredUtxos.utxos,
          wasmDeploySize + finalFee * 2
        )
      }
    }

    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(
          gatheredUtxos.utxos[i].txId
        )
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          redeemScript: redeemScript,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: bitcoin.script.compile([
              bitcoin.opcodes.OP_HASH160,
              bitcoin.crypto.hash160(redeemScript),
              bitcoin.opcodes.OP_EQUAL,
            ]),
          },
        })
      }
      if (
        getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
        getAddressType(gatheredUtxos.utxos[i].address) === 3
      ) {
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
          },
        })
      }
    }

    if (gatheredUtxos.totalAmount < finalFee * 2 + wasmDeploySize) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

    psbt.addOutput({
      value: finalFee + wasmDeploySize + 546,
      address: account.taproot.address,
    })

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee * 2 + wasmDeploySize)

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    return { psbt: psbt.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error)
  }
} 