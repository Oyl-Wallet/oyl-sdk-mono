import fetch from 'node-fetch'
import { EsploraRpc } from './esplora'
import * as alkanes_rpc from 'alkanes/lib/rpc'
import { Outpoint } from '..'
import { metashrew } from './metashrew'
import { AlkanesOutpoint } from '../types/alkanes'

export const stripHexPrefix = (s: string): string =>
  s.substr(0, 2) === '0x' ? s.substr(2) : s

let id = 0

// Helper function to convert BigInt values to hex strings for JSON serialization
export function mapToPrimitives(v: any): any {
  switch (typeof v) {
    case 'bigint':
      return '0x' + v.toString(16)
    case 'object':
      if (v === null) return null
      if (Buffer.isBuffer(v)) return '0x' + v.toString('hex')
      if (Array.isArray(v)) return v.map((v) => mapToPrimitives(v))
      return Object.fromEntries(
        Object.entries(v).map(([key, value]) => [key, mapToPrimitives(value)])
      )
    default:
      return v
  }
}

// Helper function to convert hex strings back to BigInt values
export function unmapFromPrimitives(v: any): any {
  switch (typeof v) {
    case 'string':
      if (v !== '0x' && !isNaN(v as any)) return BigInt(v)
      if (v.substr(0, 2) === '0x' || /^[0-9a-f]+$/.test(v))
        return Buffer.from(stripHexPrefix(v), 'hex')
      return v
    case 'object':
      if (v === null) return null
      if (Array.isArray(v)) return v.map((item) => unmapFromPrimitives(item))
      return Object.fromEntries(
        Object.entries(v).map(([key, value]) => [
          key,
          unmapFromPrimitives(value),
        ])
      )
    default:
      return v
  }
}

const opcodes: string[] = ['99', '100', '101', '102', '103', '104', '1000']
const opcodesHRV: string[] = [
  'name',
  'symbol',
  'totalSupply',
  'cap',
  'minted',
  'mintAmount',
  'data',
]

export class AlkanesRpc {
  public alkanesUrl: string
  public esplora: EsploraRpc

  constructor(url: string) {
    this.alkanesUrl = url
    this.esplora = new EsploraRpc(url)
  }

  async _metashrewCall(method: string, params: any[] = []) {
    const rpc = new alkanes_rpc.AlkanesRpc({ baseUrl: metashrew.get() })
    return mapToPrimitives(
      await (rpc[method.split('_')[1] as keyof typeof rpc] as Function)(unmapFromPrimitives(params[0] || {}))
    )
  }

  async _call(method: string, params: (string | number | boolean | undefined | any)[] = []) {
    const requestData = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1,
    }

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    }

    try {
      const response = await fetch(this.alkanesUrl, requestOptions)
      const responseData = await response.json()

      if (responseData.error) {
        console.error('Alkanes JSON-RPC Error:', responseData.error)
        throw new Error(responseData.error)
      }

      return responseData.result
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request Timeout:', error)
        throw new Error('Request timed out')
      } else {
        console.error('Request Error:', error)
        throw error
      }
    }
  }

  async getAlkanesByHeight(params: { height: number; protocolTag?: string }): Promise<any> {
    return await this._call('alkanes::by_height', [params.height, params.protocolTag])
  }

  async getAlkanesByAddress({
    address,
    protocolTag = '1',
    name,
  }: {
    address: string
    protocolTag?: string
    name?: string
  }): Promise<AlkanesOutpoint[]> {
    try {
      const ret = await this._call('alkanes_protorunesbyaddress', [
        {
          address,
          protocolTag,
        },
      ])

      const alkanesList = ret.outpoints
        .filter((outpoint: any) => outpoint.runes.length > 0)
        .map((outpoint: any) => ({
          ...outpoint,
          outpoint: {
            vout: outpoint.outpoint.vout,
            txid: Buffer.from(outpoint.outpoint.txid, 'hex')
              .reverse()
              .toString('hex'),
          },
          runes: outpoint.runes.map((rune: any) => ({
            ...rune,
            balance: parseInt(rune.balance, 16).toString(),
            rune: {
              ...rune.rune,
              id: {
                block: parseInt(rune.rune.id.block, 16).toString(),
                tx: parseInt(rune.rune.id.tx, 16).toString(),
              },
            },
          })),
        }))

      if (name) {
        return alkanesList.flatMap((outpoints: any) =>
          outpoints.runes.filter((item: any) => item.rune.name === name)
        )
      }

      return alkanesList
    } catch (error) {
      console.error('Error in getAlkanesByAddress:', error)
      throw error
    }
  }

  async getAlkanesByOutpoint(params: { txid: string; vout: number; protocolTag?: string; height?: string }): Promise<any> {
    return await this._call('alkanes::by_outpoint', [params.txid, params.vout, params.protocolTag, params.height])
  }

  async getAlkaneById(params: { block: string; tx: string }): Promise<any> {
    return await this._call('alkane::by_id', [params.block, params.tx])
  }

  async getAlkanes(params: { limit: number; offset?: number }): Promise<any[]> {
    return await this._call('alkanes', [params.limit, params.offset])
  }

  async trace(params: { vout: number; txid: string }): Promise<any> {
    return await this._call('alkane::trace', [params.vout, params.txid])
  }

  async simulate(request: Partial<any>, decoder?: any): Promise<any> {
    return await this._call('alkane::simulate', [request, decoder])
  }

  async simulatePoolInfo(request: any): Promise<any> {
    return await this._call('alkane::simulate_pool_info', [request])
  }

  async previewRemoveLiquidity(params: { token: any; tokenAmount: bigint }): Promise<any> {
    return await this._call('alkane::preview_remove_liquidity', [params.token, params.tokenAmount])
  }

  async meta(request: Partial<any>, decoder?: any): Promise<any> {
    return await this._call('alkane::meta', [request, decoder])
  }

  parsePoolInfo(hexData: string) {
    function parseLittleEndian(hexString: string): string[] {
      // Remove the "0x" prefix if present
      if (hexString.startsWith('0x')) {
        hexString = hexString.slice(2)
      }
      // Ensure the input length is a multiple of 32 hex chars (128-bit each)
      if (hexString.length % 32 !== 0) {
        throw new Error(
          'Invalid hex length. Expected multiples of 128-bit (32 hex chars).'
        )
      }
      // Function to convert a single 128-bit segment
      const convertSegment = (segment: string): bigint => {
        const littleEndianHex = segment.match(/.{2}/g)?.reverse()?.join('')
        if (!littleEndianHex) {
          throw new Error('Failed to process hex segment.')
        }
        return BigInt('0x' + littleEndianHex)
      }
      // Split into 128-bit (32 hex character) chunks
      const chunks = hexString.match(/.{32}/g) || []
      const parsedValues = chunks.map(convertSegment)
      return parsedValues.map((num) => num.toString())
    }
    // Parse the data
    const parsedData = parseLittleEndian(hexData)
    return {
      tokenA: {
        block: parsedData[0],
        tx: parsedData[1],
      },
      tokenB: {
        block: parsedData[2],
        tx: parsedData[3],
      },
      reserveA: parsedData[4],
      reserveB: parsedData[5],
    }
  }

  parseSimulateReturn(v: any) {
    if (v === '0x') {
      return undefined
    }
    const stripHexPrefix = (v: string) => (v.startsWith('0x') ? v.slice(2) : v)
    const addHexPrefix = (v: string) => '0x' + stripHexPrefix(v)

    let decodedString: string
    try {
      decodedString = Buffer.from(stripHexPrefix(v), 'hex').toString('utf8')
      if (/[\uFFFD]/.test(decodedString)) {
        throw new Error('Invalid UTF-8 string')
      }
    } catch (err) {
      decodedString = addHexPrefix(v)
    }

    return {
      string: decodedString,
      bytes: addHexPrefix(v),
      le: BigInt(
        addHexPrefix(
          Buffer.from(
            Array.from(Buffer.from(stripHexPrefix(v), 'hex')).reverse()
          ).toString('hex')
        )
      ).toString(),
      be: BigInt(addHexPrefix(v)).toString(),
    }
  }
}
