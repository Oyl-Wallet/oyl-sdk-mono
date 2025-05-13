import * as bitcoin from 'bitcoinjs-lib'
import ECPairFactory from 'ecpair'
import ecc from '@bitcoinerlab/secp256k1'
import BigNumber from 'bignumber.js'
import { maximumScriptBytes } from './constants'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { SandshrewBitcoinClient } from '@oyl-sdk/rpc-client/sandshrew'
import { EsploraRpc } from '@oyl-sdk/rpc-client/esplora'
import { Provider } from '../provider/provider'
import { addressFormats } from '@sadoprotocol/ordit-sdk'
import { AddressKey } from '@oyl-sdk/core/account'
import * as CBOR from 'cbor-x'

bitcoin.initEccLib(ecc)

export interface IBISWalletIx {
  validity: any
  isBrc: boolean
  isSns: boolean
  name: any
  amount: any
  isValidTransfer: any
  operation: any
  ticker: any
  isJson: boolean
  content?: string
  inscription_name: any
  inscription_id: string
  inscription_number: number
  metadata: any
  owner_wallet_addr: string
  mime_type: string
  last_sale_price: any
  slug: any
  collection_name: any
  content_url: string
  bis_url: string

  wallet?: string
  media_length?: number
  genesis_ts?: number
  genesis_height?: number
  genesis_fee?: number
  output_value?: number
  satpoint?: string
  collection_slug?: string
  confirmations?: number
}

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

export function getNetwork(
  value: Network | 'main' | 'mainnet' | 'regtest' | 'testnet' | 'signet'
) {
  if (value === 'mainnet' || value === 'main') {
    return bitcoin.networks['bitcoin']
  }

  if (value === 'signet') {
    return bitcoin.networks['testnet']
  }

  return bitcoin.networks[value]
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
    network: provider.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()
  const tx = await provider.sandshrew.bitcoindRpc.testMemPoolAccept([
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

export function calculateAmountGathered(utxoArray: IBlockchainInfoUTXO[]) {
  return utxoArray?.reduce((prev, currentValue) => prev + currentValue.value, 0)
}

export function calculateAmountGatheredUtxo(utxoArray: Utxo[]) {
  return utxoArray?.reduce(
    (prev, currentValue) => prev + currentValue.satoshis,
    0
  )
}

export const formatInputsToSign = async ({
  _psbt,
  senderPublicKey,
  network,
}: {
  _psbt: bitcoin.Psbt
  senderPublicKey: string
  network: bitcoin.Network
}) => {
  let index = 0
  for await (const v of _psbt.data.inputs) {
    const isSigned = v.finalScriptSig || v.finalScriptWitness
    const lostInternalPubkey = !v.tapInternalKey
    if (!isSigned || lostInternalPubkey) {
      const tapInternalKey = toXOnly(Buffer.from(senderPublicKey, 'hex'))
      const p2tr = bitcoin.payments.p2tr({
        internalPubkey: tapInternalKey,
        network: network,
      })
      if (
        v.witnessUtxo?.script.toString('hex') === p2tr.output?.toString('hex')
      ) {
        v.tapInternalKey = tapInternalKey
      }
    }
    index++
  }

  return _psbt
}

export const timeout = async (n) =>
  await new Promise((resolve) => setTimeout(resolve, n))

export const signInputs = async (
  psbt: bitcoin.Psbt,
  toSignInputs: ToSignInput[],
  taprootPubkey: string,
  segwitPubKey: string,
  segwitSigner: any,
  taprootSigner: any
) => {
  const taprootInputs: ToSignInput[] = []
  const segwitInputs: ToSignInput[] = []
  const inputs = psbt.data.inputs
  toSignInputs.forEach(({ publicKey }, i) => {
    const input = inputs[i]
    if (publicKey === taprootPubkey && !input.finalScriptWitness) {
      taprootInputs.push(toSignInputs[i])
    }
    if (segwitPubKey && segwitSigner) {
      if (publicKey === segwitPubKey) {
        segwitInputs.push(toSignInputs[i])
      }
    }
  })
  if (taprootInputs.length > 0) {
    await taprootSigner(psbt, taprootInputs)
  }
  if (segwitSigner && segwitInputs.length > 0) {
    await segwitSigner(psbt, segwitInputs)
  }
  return psbt
}

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

export function getAddressType(address: string): AddressType | null {
  if (
    addressFormats.mainnet.p2pkh.test(address) ||
    addressFormats.testnet.p2pkh.test(address) ||
    addressFormats.regtest.p2pkh.test(address)
  ) {
    return AddressType.P2PKH
  } else if (
    addressFormats.mainnet.p2tr.test(address) ||
    addressFormats.testnet.p2tr.test(address) ||
    addressFormats.regtest.p2tr.test(address)
  ) {
    return AddressType.P2TR
  } else if (
    addressFormats.mainnet.p2sh.test(address) ||
    addressFormats.testnet.p2sh.test(address) ||
    addressFormats.regtest.p2sh.test(address)
  ) {
    return AddressType.P2SH_P2WPKH
  } else if (
    addressFormats.mainnet.p2wpkh.test(address) ||
    addressFormats.testnet.p2wpkh.test(address) ||
    addressFormats.regtest.p2wpkh.test(address)
  ) {
    return AddressType.P2WPKH
  } else {
    return null
  }
}

export function getAddressKey(address: string): AddressKey {
  const addressType = getAddressType(address)
  switch (addressType) {
    case AddressType.P2WPKH:
      return 'nativeSegwit'
    case AddressType.P2SH_P2WPKH:
      return 'nestedSegwit'
    case AddressType.P2TR:
      return 'taproot'
    case AddressType.P2PKH:
      return 'legacy'
    default:
      return null
  }
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
      const result = await sandshrewBtcClient.bitcoindRpc.getMemPoolEntry(txId)

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

export const isValidJSON = (str: string) => {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

export const encodeVarint = (bigIntValue: any) => {
  const bufferArray = []
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

export const packUTF8 = function (s) {
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