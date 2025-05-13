import { Provider } from '@oyl-sdk/core'
import * as bitcoin from 'bitcoinjs-lib'
import { Account, Signer } from '@oyl-sdk/core'
import { minimumFee } from '@oyl-sdk/btc'
import { getEstimatedFee } from '@oyl-sdk/core'
import { OylTransactionError } from '@oyl-sdk/core'
import { GatheredUtxos } from '@oyl-sdk/core'
import { getAddressType } from '@oyl-sdk/core'
import { FormattedUtxo } from '@utxo/utxo'

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

export const findXAmountOfSats = (
  utxos: FormattedUtxo[],
  targetAmount: number
): GatheredUtxos => {
  let totalAmount = 0
  const gatheredUtxos: FormattedUtxo[] = []

  for (const utxo of utxos) {
    if (totalAmount >= targetAmount) break
    gatheredUtxos.push(utxo)
    totalAmount += utxo.satoshis
  }

  if (totalAmount < targetAmount) {
    throw new OylTransactionError(Error('Insufficient balance'))
  }

  return { utxos: gatheredUtxos, totalAmount }
} 