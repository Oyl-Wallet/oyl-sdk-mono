import * as bitcoin from 'bitcoinjs-lib'
import { waitForTransaction } from '../shared/utils'
import { Provider } from './provider'

export type PushPsbtArgs = {
  psbtHex?: string
  psbtBase64?: string
  provider: Provider
}

export type PushPsbtResult = {
  txId: string
  rawTx: string
  size: number
  weight: number
  fee: number
  satsPerVByte: string
}

export async function pushPsbt({ psbtHex, psbtBase64, provider }: PushPsbtArgs): Promise<PushPsbtResult> {
  if (!psbtHex && !psbtBase64) {
    throw new Error('Please supply psbt in either base64 or hex format')
  }
  if (psbtHex && psbtBase64) {
    throw new Error('Please select one format of psbt to broadcast')
  }

  let psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })

  if (psbtHex) {
    psbt = bitcoin.Psbt.fromHex(psbtHex, {
      network: provider.getNetwork(),
    })
  }

  if (psbtBase64) {
    psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: provider.getNetwork(),
    })
  }

  let extractedTx: bitcoin.Transaction

  try {
    extractedTx = psbt.extractTransaction()
  } catch (error) {
    throw new Error('Transaction could not be extracted do to invalid Psbt.')
  }

  const txId = extractedTx.getId()
  const rawTx = extractedTx.toHex()
  const [result] = await provider.sandshrew.bitcoindRpc.testMemPoolAccept!([rawTx])

  if (!result.allowed) {
    throw new Error(result['reject-reason'])
  }
  await provider.sandshrew.bitcoindRpc.sendRawTransaction!(rawTx)

  await waitForTransaction({
    txId,
    sandshrewBtcClient: provider.sandshrew,
  })

  const txInMemPool = await provider.sandshrew.bitcoindRpc.getMemPoolEntry!(txId)
  const fee = txInMemPool.fees['base'] * 10 ** 8

  return {
    txId,
    rawTx,
    size: txInMemPool.vsize,
    weight: txInMemPool.weight,
    fee: fee,
    satsPerVByte: (fee / (txInMemPool.weight / 4)).toFixed(2),
  }
} 