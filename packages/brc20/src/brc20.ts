import * as bitcoin from 'bitcoinjs-lib'
import {
  Provider,
  Account,
  calculateTaprootTxSize,
  createInscriptionScript,
  findXAmountOfSats,
  addTaprootInternalPubkey,
  getOutputValueByVOutIndex,
  tweakSigner,
  GatheredUtxos,
  OylTransactionError,
  getAddressType,
  Signer,
  pushPsbt,
} from '@oyl/sdk-core'
import { minimumFee } from '@oyl/sdk-core'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341'

export const transferEstimate = async ({
  gatheredUtxos,
  toAddress,
  feeRate,
  account,
  provider,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  toAddress: string
  feeRate: number
  account: Account
  provider: Provider
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos;

    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }
    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
    const minFee = minimumFee({
      taprootInputCount: 1,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    let calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    let finalFee = fee ? fee : calculatedFee

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee) + 546
    )

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })

      finalFee = Math.max(txSize * feeRate, 250)
      gatheredUtxos = findXAmountOfSats(
        originalGatheredUtxos.utxos,
        Number(finalFee) + 546
      )
    }

    if (gatheredUtxos.totalAmount < finalFee + 546) {
      throw new OylTransactionError(Error('Insufficient Balance'))
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

    psbt.addOutput({
      address: toAddress,
      value: 546,
    })

    const changeAmount = gatheredUtxos.totalAmount - (finalFee + 546)

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const updatedPsbt = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return { psbt: updatedPsbt.toBase64(), fee: finalFee }
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const commit = async ({
  gatheredUtxos,
  ticker,
  amount,
  feeRate,
  account,
  tweakedTaprootPublicKey,
  provider,
  finalTransferFee,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  ticker: string
  amount: number
  feeRate: number
  account: Account
  tweakedTaprootPublicKey: Buffer
  provider: Provider
  fee?: number
  finalTransferFee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const content = `{"p":"brc-20","op":"transfer","tick":"${ticker}","amt":"${amount}"}`
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
    const commitTxSize = calculateTaprootTxSize(1, 0, 2)
    const feeForCommit =
      commitTxSize * feeRate < 250 ? 250 : commitTxSize * feeRate

    const revealTxSize = calculateTaprootTxSize(1, 0, 2)
    const feeForReveal =
      revealTxSize * feeRate < 250 ? 250 : revealTxSize * feeRate

    const baseEstimate = Number(feeForCommit) + Number(feeForReveal) + 546

    let finalFee = fee ? fee + Number(feeForReveal) + 546 : baseEstimate

    const script = createInscriptionScript(tweakedTaprootPublicKey, content)

    const outputScript = bitcoin.script.compile(script)

    const inscriberInfo = bitcoin.payments.p2tr({
      internalPubkey: tweakedTaprootPublicKey,
      scriptTree: { output: outputScript },
      network: provider.getNetwork(),
    })

    if (!inscriberInfo.address) {
      throw new Error('Failed to generate inscriber address')
    }
    psbt.addOutput({
      value: Number(feeForReveal) + 546,
      address: inscriberInfo.address,
    })

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee) + Number(finalTransferFee)
    )

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee =
        txSize * feeRate < 250
          ? 250
          : txSize * feeRate + Number(feeForReveal) + 546

      gatheredUtxos = findXAmountOfSats(
        originalGatheredUtxos.utxos,
        Number(finalFee) + Number(finalTransferFee)
      )
    }

    if (gatheredUtxos.totalAmount < finalFee) {
      throw new OylTransactionError(Error('Insufficient Balance'))
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

    const changeAmount = gatheredUtxos.totalAmount - finalFee

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const updatedPsbt = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return {
      psbt: updatedPsbt.toBase64(),
      script: outputScript,
      fee: finalFee,
    }
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const reveal = async ({
  receiverAddress,
  script,
  feeRate,
  tweakedTaprootKeyPair,
  provider,
  fee = 0,
  commitTxId,
}: {
  receiverAddress: string
  script: Buffer
  feeRate: number
  tweakedTaprootKeyPair: bitcoin.Signer
  provider: Provider
  fee?: number
  commitTxId: string
}) => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
    const minFee = minimumFee({
      taprootInputCount: 1,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    const revealTxBaseFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    const revealTxChange = (fee ?? 0) === 0 ? 0 : Number(revealTxBaseFee) - (fee ?? 0)

    const commitTxOutput = await getOutputValueByVOutIndex({
      txId: commitTxId,
      vOut: 0,
      esploraRpc: provider.esplora,
    })

    if (!commitTxOutput) {
      throw new OylTransactionError(new Error('Error getting vin #0 value'))
    }

    const p2pk_redeem = { output: script }

    const { output, witness } = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
      scriptTree: p2pk_redeem,
      redeem: p2pk_redeem,
      network: provider.getNetwork(),
    })

    if (!output) {
      throw new Error('Failed to generate output script')
    }
    psbt.addInput({
      hash: commitTxId,
      index: 0,
      witnessUtxo: {
        value: commitTxOutput.value,
        script: output,
      },
      tapLeafScript: [
        {
          leafVersion: LEAF_VERSION_TAPSCRIPT,
          script: p2pk_redeem.output,
          controlBlock: witness![witness!.length - 1],
        },
      ],
    })

    psbt.addOutput({
      value: 546,
      address: receiverAddress,
    })

    if (revealTxChange > 546) {
      psbt.addOutput({
        value: revealTxChange,
        address: receiverAddress,
      })
    }

    return {
      psbt: psbt.toBase64(),
      psbtHex: psbt.toHex(),
      fee: revealTxChange,
    }
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const transfer = async ({
  commitChangeUtxoId,
  revealTxId,
  toAddress,
  feeRate,
  account,
  provider,
  fee,
}: {
  commitChangeUtxoId: string
  revealTxId: string
  toAddress: string
  feeRate: number
  account: Account
  provider: Provider
  fee?: number
}) => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
    const minFee = minimumFee({
      taprootInputCount: 1,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    const transferTxBaseFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    const transferTxChange = (fee ?? 0) === 0 ? 0 : Number(transferTxBaseFee) - (fee ?? 0)

    const commitTxOutput = await getOutputValueByVOutIndex({
      txId: commitChangeUtxoId,
      vOut: 0,
      esploraRpc: provider.esplora,
    })

    if (!commitTxOutput) {
      throw new OylTransactionError(new Error('Error getting vin #0 value'))
    }

    const revealTxOutput = await getOutputValueByVOutIndex({
      txId: revealTxId,
      vOut: 0,
      esploraRpc: provider.esplora,
    })

    if (!revealTxOutput) {
      throw new OylTransactionError(new Error('Error getting vin #0 value'))
    }

    psbt.addInput({
      hash: commitChangeUtxoId,
      index: 0,
      witnessUtxo: {
        value: commitTxOutput.value,
        script: Buffer.from(commitTxOutput.script, 'hex'),
      },
    })

    psbt.addInput({
      hash: revealTxId,
      index: 0,
      witnessUtxo: {
        value: revealTxOutput.value,
        script: Buffer.from(revealTxOutput.script, 'hex'),
      },
    })

    psbt.addOutput({
      value: 546,
      address: toAddress,
    })

    if (transferTxChange > 546) {
      psbt.addOutput({
        value: transferTxChange,
        address: account[account.spendStrategy.changeAddress].address,
      })
    }

    const updatedPsbt = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return { psbt: updatedPsbt.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const send = async ({
  gatheredUtxos,
  toAddress,
  ticker,
  amount,
  account,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  toAddress: string
  ticker: string
  amount: number
  feeRate: number
  account: Account
  provider: Provider
  signer: Signer
}) => {
  try {
    const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
      signer.taprootKeyPair,
      { network: provider.getNetwork() }
    )

    const tweakedTaprootPublicKey = toXOnly(tweakedTaprootKeyPair.publicKey)

    const { fee: transferFee } = await transferEstimate({
      gatheredUtxos,
      toAddress,
      feeRate,
      account,
      provider,
    })

    const { psbt: commitPsbt, script, fee: commitFee } = await commit({
      gatheredUtxos,
      ticker,
      amount,
      feeRate,
      account,
      tweakedTaprootPublicKey,
      provider,
      finalTransferFee: transferFee,
    })

    const { signedPsbt: signedCommitPsbt } = await signer.signAllInputs({
      rawPsbt: commitPsbt,
      finalize: true,
    })

    const commitResult = await pushPsbt({
      psbtBase64: signedCommitPsbt,
      provider,
    })

    const { psbt: revealPsbt } = await reveal({
      receiverAddress: account.taproot.address,
      script,
      feeRate,
      tweakedTaprootKeyPair,
      provider,
      commitTxId: commitResult.txId,
    })

    const { signedPsbt: signedRevealPsbt } = await signer.signAllInputs({
      rawPsbt: revealPsbt,
      finalize: true,
    })

    const revealResult = await pushPsbt({
      psbtBase64: signedRevealPsbt,
      provider,
    })

    const { psbt: transferPsbt } = await transfer({
      commitChangeUtxoId: commitResult.txId,
      revealTxId: revealResult.txId,
      toAddress,
      feeRate,
      account,
      provider,
    })

    const { signedPsbt: signedTransferPsbt } = await signer.signAllInputs({
      rawPsbt: transferPsbt,
      finalize: true,
    })

    const transferResult = await pushPsbt({
      psbtBase64: signedTransferPsbt,
      provider,
    })

    return transferResult
  } catch (error) {
    throw new OylTransactionError(error instanceof Error ? error : new Error(String(error)))
  }
} 