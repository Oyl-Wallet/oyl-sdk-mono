import { Provider } from '@oyl-sdk/core'
import * as bitcoin from 'bitcoinjs-lib'
import { Account, Signer } from '@oyl-sdk/core'
import { minimumFee } from '@oyl-sdk/core'
import { OylTransactionError } from '@oyl-sdk/core'
import { GatheredUtxos } from '@oyl-sdk/core'
import { getAddressType } from '@oyl-sdk/core'
import { FormattedUtxo } from '@oyl-sdk/core'

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