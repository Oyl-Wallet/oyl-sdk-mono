import { 
  Account,
  Signer,
  Provider,
  timeout, 
  tweakSigner,
  getEstimatedFee,
  AlkanesPayload,
  FormattedUtxo
} from '@oyl-sdk/core'
import * as bitcoin from 'bitcoinjs-lib'
import {
  createDeployCommitPsbt,
  createDeployRevealPsbt,
  deployCommit,
} from './alkanes'
export const contractDeployment = async ({
  payload,
  utxos,
  account,
  protostone,
  provider,
  feeRate,
  signer,
}: {
  payload: AlkanesPayload
  utxos: FormattedUtxo[]
  account: Account
  protostone: Buffer
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const { script, txId } = await deployCommit({
    payload,
    utxos,
    account,
    provider,
    feeRate,
    signer,
  })

  await timeout(3000)

  const reveal = await deployReveal({
    commitTxId: txId,
    script,
    protostone,
    account,
    provider,
    feeRate,
    signer,
  })

  return { ...reveal, commitTx: txId }
}

export const actualDeployCommitFee = async ({
  payload,
  tweakedPublicKey,
  utxos,
  account,
  provider,
  feeRate,
}: {
  payload: AlkanesPayload
  tweakedPublicKey: string
  utxos: FormattedUtxo[]
  account: Account
  provider: Provider
  feeRate?: number
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createDeployCommitPsbt({
    payload,
    utxos,
    tweakedPublicKey,
    account,
    provider,
    feeRate,
  })

  const { fee: estimatedFee } = await getEstimatedFee({
    feeRate: feeRate!,
    psbt,
    provider,
  })

  const { psbt: finalPsbt } = await createDeployCommitPsbt({
    payload,
    utxos,
    tweakedPublicKey,
    account,
    provider,
    feeRate,
    fee: estimatedFee,
  })

  const { fee: finalFee, vsize } = await getEstimatedFee({
    feeRate: feeRate!,
    psbt: finalPsbt,
    provider,
  })

  return { fee: finalFee, vsize }
}

export const actualDeployRevealFee = async ({
  protostone,
  tweakedPublicKey,
  commitTxId,
  receiverAddress,
  script,
  provider,
  feeRate,
}: {
  protostone: Buffer
  tweakedPublicKey: string
  commitTxId: string
  receiverAddress: string
  script: Buffer
  provider: Provider
  feeRate?: number
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createDeployRevealPsbt({
    protostone,
    commitTxId,
    receiverAddress,
    script,
    tweakedPublicKey,
    provider,
    feeRate: feeRate!,
  })

  const { fee: estimatedFee } = await getEstimatedFee({
    feeRate: feeRate!,
    psbt,
    provider,
  })

  const { psbt: finalPsbt } = await createDeployRevealPsbt({
    protostone,
    commitTxId,
    receiverAddress,
    script,
    tweakedPublicKey,
    provider,
    feeRate: feeRate!,
    fee: estimatedFee,
  })

  const { fee: finalFee, vsize } = await getEstimatedFee({
    feeRate: feeRate!,
    psbt: finalPsbt,
    provider,
  })

  return { fee: finalFee, vsize }
}

export const deployReveal = async ({
  protostone,
  commitTxId,
  script,
  account,
  provider,
  feeRate,
  signer,
}: {
  protostone: Buffer
  commitTxId: string
  script: string
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.network,
    }
  )

  const tweakedPublicKey = tweakedTaprootKeyPair.publicKey.toString('hex')

  const { fee } = await actualDeployRevealFee({
    protostone,
    tweakedPublicKey,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    provider,
    feeRate,
  })

  const { psbt: finalRevealPsbt } = await createDeployRevealPsbt({
    protostone,
    tweakedPublicKey,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    provider,
    feeRate: feeRate!,
    fee,
  })

  let finalReveal = bitcoin.Psbt.fromBase64(finalRevealPsbt, {
    network: provider.network,
  })

  finalReveal.signInput(0, tweakedTaprootKeyPair)
  finalReveal.finalizeInput(0)

  const finalSignedPsbt = finalReveal.toBase64()

  const revealResult = await provider.pushPsbt({
    psbtBase64: finalSignedPsbt,
  })

  return revealResult
}
