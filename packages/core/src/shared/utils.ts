import * as bitcoin from 'bitcoinjs-lib'
import ECPairFactory from 'ecpair'
import ecc from '@bitcoinerlab/secp256k1'
import BigNumber from 'bignumber.js'
import { maximumScriptBytes } from './constants'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { SandshrewBitcoinClient } from '..'
import { EsploraRpc } from '..'
import { Network } from '../types/network'
import { Provider } from '../provider/provider'
import { FormattedUtxo } from '../types/utxo'
import * as CBOR from 'cbor-x'
import { DecodedCBOR, DecodedCBORValue, IBISWalletIx } from '../types'

bitcoin.initEccLib(ecc)

export const addressTypeMap = { 0: 'p2pkh', 1: 'p2tr', 2: 'p2sh', 3: 'p2wpkh' }
export const inscriptionSats = 546

export const ECPair = ECPairFactory(ecc)

export const assertHex = (pubKey: Buffer) =>
  pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
  return bitcoin.crypto.taggedHash(
    'TapTweak',
    Buffer.concat(h ? [pubKey, h] : [pubKey])
  )
}

export function getNetwork(value: Network | 'main') {
  const networkMap: Record<Network, bitcoin.Network> = {
    bitcoin: bitcoin.networks.bitcoin,
    mainnet: bitcoin.networks.bitcoin,
    main: bitcoin.networks.bitcoin,
    regtest: bitcoin.networks.regtest,
    signet: bitcoin.networks.testnet,
    oylnet: bitcoin.networks.regtest,
    oylnet2: bitcoin.networks.regtest,
    alkanes: bitcoin.networks.regtest,
    testnet: bitcoin.networks.testnet
  }
  return networkMap[value]
}

export async function getFee({
  provider,
  psbt,
  feeRate,
}: {
  provider: Provider
  psbt: string
  feeRate: number
}) {
  let rawPsbt = bitcoin.Psbt.fromBase64(psbt, {
    network: provider.getNetwork(),
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()
  const tx = await provider.sandshrew.bitcoindRpc.testMemPoolAccept!([
    signedHexPsbt,
  ])
  const vsize = tx[0].vsize

  const accurateFee = vsize * feeRate
  return accurateFee
}

export function satoshisToAmount(val: number) {
  const num = new BigNumber(val)
  return num.dividedBy(100000000).toFixed(8)
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function amountToSatoshis(val: any) {
  const num = new BigNumber(val)
  return num.multipliedBy(100000000).toNumber()
}

export const validator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature)

export const getWitnessDataChunk = function (
  content: string,
  encodeType: BufferEncoding = 'utf8'
) {
  const buffered = Buffer.from(content, encodeType)
  const contentChunks: Buffer[] = []
  let chunks = 0

  while (chunks < buffered.byteLength) {
    const split = buffered.subarray(chunks, chunks + maximumScriptBytes)
    chunks += split.byteLength
    contentChunks.push(split)
  }

  return contentChunks
}



export const timeout = async (n: number) =>
  await new Promise((resolve) => setTimeout(resolve, n))

export const createInscriptionScript = (
  pubKey: Buffer,
  content: string
): bitcoin.Stack => {
  const mimeType = 'text/plain;charset=utf-8'
  const textEncoder = new TextEncoder()
  const mimeTypeBuff = Buffer.from(textEncoder.encode(mimeType))
  const contentBuff = Buffer.from(textEncoder.encode(content))
  const markerBuff = Buffer.from(textEncoder.encode('ord'))

  return [
    pubKey,
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_0,
    bitcoin.opcodes.OP_IF,
    markerBuff,
    1,
    1,
    mimeTypeBuff,
    bitcoin.opcodes.OP_0,
    contentBuff,
    bitcoin.opcodes.OP_ENDIF,
  ]
}

export function encodeToBase26(inputString: string): string {
  const baseCharCode = 'a'.charCodeAt(0)
  return inputString
    .toLowerCase()
    .split('')
    .map((char) => {
      const charCode = char.charCodeAt(0)
      if (charCode >= baseCharCode && charCode < baseCharCode + 26) {
        return String.fromCharCode(charCode - baseCharCode + 97) // Convert to base26 (a-z)
      } else {
        return char
      }
    })
    .join('')
}

export function hexToLittleEndian(hex: string) {
  let littleEndianHex = ''
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    littleEndianHex += hex.substr(i, 2)
  }
  return littleEndianHex
}

export async function waitForTransaction({
  txId,
  sandshrewBtcClient,
}: {
  txId: string
  sandshrewBtcClient: SandshrewBitcoinClient
}) {
  const timeout = 60000 // 1 minute in milliseconds
  const startTime = Date.now()

  while (true) {
    try {
      const result = await sandshrewBtcClient.bitcoindRpc.getMemPoolEntry!(txId)

      if (result) {
        await delay(5000)
        break
      }

      // Check for timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout: Could not find transaction in mempool: ${txId}`
        )
      }

      // Wait for 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } catch (error) {
      // Check for timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout: Could not find transaction in mempool: ${txId}`
        )
      }

      // Wait for 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

export async function getOutputValueByVOutIndex({
  txId,
  vOut,
  esploraRpc,
}: {
  txId: string
  vOut: number
  esploraRpc: EsploraRpc
}): Promise<{ value: number; script: string } | null> {
  const timeout: number = 60000 // 1 minute in milliseconds
  const startTime: number = Date.now()

  while (true) {
    const txDetails = await esploraRpc.getTxInfo(txId)

    if (txDetails?.vout && txDetails.vout.length > 0) {
      return {
        value: txDetails.vout[vOut].value,
        script: txDetails.vout[vOut].scriptpubkey,
      }
    }

    // Check for timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout reached, stopping search.')
    }

    // Wait for 5 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

export function calculateTaprootTxSize(
  taprootInputCount: number,
  nonTaprootInputCount: number,
  outputCount: number
): number {
  const baseTxSize = 10 // Base transaction size without inputs/outputs

  // Size contributions from inputs
  const taprootInputSize = 64 // Average size of a Taproot input (can vary)
  const nonTaprootInputSize = 42 // Average size of a non-Taproot input (can vary)

  const outputSize = 40

  const totalInputSize =
    taprootInputCount * taprootInputSize +
    nonTaprootInputCount * nonTaprootInputSize
  const totalOutputSize = outputCount * outputSize

  return baseTxSize + totalInputSize + totalOutputSize
}

export const minimumFee = ({
  taprootInputCount,
  nonTaprootInputCount,
  outputCount,
}: {
  taprootInputCount: number
  nonTaprootInputCount: number
  outputCount: number
}) => {
  return calculateTaprootTxSize(
    taprootInputCount,
    nonTaprootInputCount,
    outputCount
  )
}

export const isValidJSON = (str: string) => {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

export const encodeVarint = (bigIntValue: any) => {
  const bufferArray: number[] = []
  let num = bigIntValue

  do {
    let byte = num & BigInt(0x7f) // Get the next 7 bits of the number.
    num >>= BigInt(7) // Remove the 7 bits we just processed.
    if (num !== BigInt(0)) {
      // If there are more bits to process,
      byte |= BigInt(0x80) // set the continuation bit.
    }
    bufferArray.push(Number(byte))
  } while (num !== BigInt(0))

  return { varint: Buffer.from(bufferArray) }
}

export function decodeCBOR(hex: string): DecodedCBOR {
  const buffer = Buffer.from(hex, 'hex')
  return CBOR.decode(buffer)
}

export const getVSize = (data: Buffer) => {
  let totalSize = data.length
  if (totalSize < 0xfd) {
    totalSize += 1
  } else if (totalSize <= 0xffff) {
    totalSize += 3
  } else if (totalSize <= 0xffffffff) {
    totalSize += 5
  }
  return Math.ceil(totalSize / 4)
}

export const packUTF8 = function (s: string) {
  const result = [''];
  let b = 0;
  for (let i = 0; i < s.length; i++) {
    const length = Buffer.from(s[i]).length;
    if (b + length > 15) {
      b = 0;
      result.push('');
      i--;
    } else {
      b += length;
      result[result.length - 1] += s[i];
    }
  }
  return result.map((v) => v && Buffer.from(Array.from(Buffer.from(v)).reverse()).toString('hex') || '')
}

export function findXAmountOfSats(utxos: FormattedUtxo[], target: number) {
  let totalAmount = 0
  const selectedUtxos: FormattedUtxo[] = []

  for (const utxo of utxos) {
    if (totalAmount >= target) break

    selectedUtxos.push(utxo)
    totalAmount += utxo.satoshis
  }
  return {
    utxos: selectedUtxos,
    totalAmount,
  }
}

export const toTxId = (rawLeTxid: string) =>
  Buffer.from(rawLeTxid, 'hex').reverse().toString('hex')