import * as bitcoin from 'bitcoinjs-lib'
import { 
  addUtxoInputs,
  addTaprootInternalPubkey,
  OylTransactionError,
  getPsbtFee,
} from '@oyl/sdk-core'
import type { Account, Provider, FormattedUtxo, Base64Psbt } from '@oyl/sdk-core'
import { BTC_DUST_AMOUNT, DEFAULT_SEND_FEE } from '@oyl/sdk-core'

export const btcSendPsbt = async ({
  utxos,
  toAddress,
  amount,
  fee,
  account,
  provider,
}: {
  utxos: FormattedUtxo[]
  toAddress: string
  amount: number
  fee: number
  account: Account
  provider: Provider
}): Promise<{ psbt: Base64Psbt }> => {
  try {
    if (!utxos?.length) {
      throw new Error('No utxos provided')
    }
    if (!fee) {
      throw new Error('No fee provided')
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({
      network: provider.getNetwork(),
    })

    await addUtxoInputs({
      psbt,
      utxos,
      esploraProvider: provider.esplora,
    })

    psbt.addOutput({
      address: toAddress,
      value: Number(amount),
    })

    const totalInputAmount = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
    const changeAmount = totalInputAmount - (fee + Number(amount))

    if (changeAmount < 0) {
      throw new Error('Insufficient Balance')
    }

    if (changeAmount > BTC_DUST_AMOUNT) {
      psbt.addOutput({
        address: account[account.spendStrategy.changeAddress].address,
        value: changeAmount,
      })
    }

    const updatedPsbt = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return { psbt: updatedPsbt.toBase64() as Base64Psbt }
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const createBtcSendPsbt = async ({
  utxos,
  toAddress,
  amount,
  feeRate,
  account,
  provider,
}: {
  utxos: FormattedUtxo[]
  toAddress: string
  amount: number
  feeRate: number
  account: Account
  provider: Provider
}): Promise<{ psbt: Base64Psbt; fee: number; vsize: number }> => {
  // First create a psbt with a minimum fee
  const { psbt } = await btcSendPsbt({
    utxos,
    toAddress,
    amount,
    fee: DEFAULT_SEND_FEE,
    account,
    provider,
  })

  // Then use the target feeRate to get the actual fee for the psbt
  const { fee, vsize } = getPsbtFee({
    feeRate,
    psbt,
    provider,
  })

  // Reconstruct the psbt with the actual fee
  const { psbt: finalPsbt } = await btcSendPsbt({
    utxos,
    toAddress,
    amount,
    fee,
    account,
    provider,
  })

  return { psbt: finalPsbt, fee, vsize }
}
