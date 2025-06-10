import { OrdOutput, OrdCollectibleData } from '..'
import { decodeCBOR } from '..'

type JsonRpcResponse = {
  jsonrpc: string
  result?: any
  error?: { message: string }
  id: number
}

export type OrdOutputRune = {
  amount: number
  divisibility: number
}

export class OrdRpc {
  public ordUrl: string

  constructor(url: string) {
    this.ordUrl = url
  }

  async _call<T>(method: string, params: any[] = []): Promise<T> {
    const requestData = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 2,
    }

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    }

    try {
      const response = await fetch(this.ordUrl, requestOptions)
      const responseData = await response.json() as JsonRpcResponse

      if (responseData.error) {
        console.error('Ord JSON-RPC Error:', responseData.error)
        throw new Error(responseData.error.message)
      }

      return responseData.result as T
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
  async getInscriptionById(inscriptionId: string): Promise<OrdCollectibleData> {
    return await this._call<OrdCollectibleData>('ord_inscription', [inscriptionId])
  }
  async getInscriptionContent(inscriptionId: string) {
    return await this._call('ord_content', [inscriptionId])
  }
  async getInscriptionByNumber(number: string) {
    return await this._call('ord_inscription', [number])
  }

  async getInscriptions(startingNumber?: string) {
    return await this._call('ord_inscriptions', [
      startingNumber ? startingNumber : '',
    ])
  }

  async getInscriptionsByBlockHash(blockHash: string) {
    return await this._call('ord_block', [blockHash])
  }

  async getInscriptionsByBlockHeight(blockHash: string) {
    return await this._call('ord_block', [blockHash])
  }
  async getInscriptionBySat(satNumber: string) {
    return await this._call('ord_r:sat', [satNumber])
  }
  async getInscriptionBySatWithIndex(satNumber: string, index?: string) {
    return await this._call('ord_r:sat::at', [satNumber, index])
  }
  async getInscriptionChildren(inscriptionId: string, page?: string) {
    return await this._call('ord_r:children', [inscriptionId, page])
  }
  async getInscriptionMetaData(inscriptionId: string) {
    const hex: string = await this._call('ord_r:metadata', [inscriptionId])
    if (hex.includes('not found')) {
      throw new Error('Inscription metadata not found') // TODO: Move this to the _call method
    }

    return decodeCBOR(hex)
  }
  async getTxOutput(txIdVout: string): Promise<OrdOutput> {
    return await this._call('ord_output', [txIdVout])
  }
  async getSatByNumber(number: string) {
    return await this._call('ord_sat', [number])
  }
  async getSatByDecimal(decimal: string) {
    return await this._call('ord_sat', [decimal])
  }
  async getSatByDegree(degree: string) {
    return await this._call('ord_sat', [degree])
  }
  async getSatByBase26(base26: string) {
    return await this._call('ord_sat', [base26])
  }
  async getSatByPercentage(percentage: string) {
    return await this._call('ord_sat', [percentage])
  }
  async getRuneByName(runeName: string) {
    return await this._call('ord_rune', [runeName])
  }
  async getRuneById(runeId: string) {
    return await this._call('ord_rune', [runeId])
  }
  async getRunes() {
    return await this._call('ord_runes', [])
  }
  async getOrdData(address: string) {
    return await this._call('ord_address', [address])
  }
}
