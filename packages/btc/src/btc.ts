import * as bitcoin from 'bitcoinjs-lib'
import { 
  Account,
  Provider,
  Signer,
  FormattedUtxo,
  getAddressType,
  formatInputsToSign,
  OylTransactionError,
  pushPsbt,
} from '@oyl/sdk-core'

export const BTC_DUST_AMOUNT = 295

const addUtxoInputs = async (
  psbt: bitcoin.Psbt,
  utxos: FormattedUtxo[],
  account: Account,
  provider: Provider
) => {
  for (let i = 0; i < utxos.length; i++) {
    if (getAddressType(utxos[i].address) === 0) {
      const previousTxHex: string = await provider.esplora.getTxHex(
        utxos[i].txId
      )
      psbt.addInput({
        hash: utxos[i].txId,
        index: utxos[i].outputIndex,
        nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
      })
    }
    if (getAddressType(utxos[i].address) === 2) {
      const redeemScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_0,
        bitcoin.crypto.hash160(
          Buffer.from(account.nestedSegwit.pubkey, 'hex')
        ),
      ])

      psbt.addInput({
        hash: utxos[i].txId,
        index: utxos[i].outputIndex,
        redeemScript: redeemScript,
        witnessUtxo: {
          value: utxos[i].satoshis,
          script: bitcoin.script.compile([
            bitcoin.opcodes.OP_HASH160,
            bitcoin.crypto.hash160(redeemScript),
            bitcoin.opcodes.OP_EQUAL,
          ]),
        },
      })
    }
    if (
      getAddressType(utxos[i].address) === 1 ||
      getAddressType(utxos[i].address) === 3
    ) {
      psbt.addInput({
        hash: utxos[i].txId,
        index: utxos[i].outputIndex,
        witnessUtxo: {
          value: utxos[i].satoshis,
          script: Buffer.from(utxos[i].scriptPk, 'hex'),
        },
      })
    }
  }
}

export const createPsbt = async ({
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
}) => {
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

    await addUtxoInputs(psbt, utxos, account, provider)

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

    const updatedPsbt = await formatInputsToSign({
      _psbt: psbt,
      senderPublicKey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return { psbt: updatedPsbt.toBase64(), fee }
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const send = async ({
  utxos,
  toAddress,
  amount,
  fee,
  account,
  provider,
  signer,
}: {
  utxos: FormattedUtxo[]
  toAddress: string
  amount: number
  fee: number
  account: Account
  provider: Provider
  signer: Signer
}) => {
  const { psbt: finalPsbt } = await createPsbt({
    utxos,
    toAddress,
    amount,
    fee,
    account,
    provider,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await pushPsbt({
    psbtBase64: signedPsbt,
    provider,
  })

  return result
}

export const actualFee = async ({
  utxos,
  toAddress,
  amount,
  fee,
  account,
  provider,
  signer,
}: {
  utxos: FormattedUtxo[]
  toAddress: string
  amount: number
  fee: number
  account: Account
  provider: Provider
  signer: Signer
}) => {
  const { psbt } = await createPsbt({
    utxos,
    toAddress: toAddress,
    amount: amount,
    fee: fee,
    account: account,
    provider: provider,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()

  if (!provider.sandshrew.bitcoindRpc.testMemPoolAccept) {
    throw new Error('testMemPoolAccept method not available')
  }

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
  )[0].vsize

  return { fee }
}
