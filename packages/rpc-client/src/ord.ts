import fetch from 'node-fetch'
import { IOrdProvider, OrdOutput } from '../interfaces'

export type OrdOutputRune = {
  amount: number
  divisibility: number
}

export interface OrdOutput {
  address: string
  indexed: boolean
  inscriptions: string[]
  runes: Record<string, OrdOutputRune> | OrdOutputRune[][]
  sat_ranges: number[][]
  script_pubkey: string
  spent: boolean
  transaction: string
  value: number
  output?: string
}

export class OrdRpc implements IOrdProvider {
  public ordUrl: string

  constructor(url: string) {
    this.ordUrl = url
  }

  async _call(method: string, params = []) {
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
      const response = await fetch(this.ordUrl, requestOptions)
      const responseData = await response.json()

      if (responseData.error) {
        console.error('Ord JSON-RPC Error:', responseData.error)
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

  async getInscriptionById(inscriptionId: string): Promise<any> {
    return await this._call('ord_inscription::by_id', [inscriptionId])
  }

  async getInscriptionContent(inscriptionId: string): Promise<any> {
    return await this._call('ord_inscription::content', [inscriptionId])
  }

  async getInscriptionByNumber(number: string): Promise<any> {
    return await this._call('ord_inscription::by_number', [number])
  }

  async getInscriptions(startingNumber?: string): Promise<any> {
    return await this._call('ord_inscriptions', [startingNumber])
  }

  async getInscriptionsByBlockHash(blockHash: string): Promise<any> {
    return await this._call('ord_inscriptions::by_block_hash', [blockHash])
  }

  async getInscriptionsByBlockHeight(blockHeight: string): Promise<any> {
    return await this._call('ord_inscriptions::by_block_height', [blockHeight])
  }

  async getInscriptionBySat(satNumber: string): Promise<any> {
    return await this._call('ord_inscription::by_sat', [satNumber])
  }

  async getInscriptionBySatWithIndex(satNumber: string, index?: string): Promise<any> {
    return await this._call('ord_inscription::by_sat_with_index', [satNumber, index])
  }

  async getInscriptionChildren(inscriptionId: string, page?: string): Promise<any> {
    return await this._call('ord_inscription::children', [inscriptionId, page])
  }

  async getInscriptionMetaData(inscriptionId: string): Promise<any> {
    return await this._call('ord_inscription::metadata', [inscriptionId])
  }

  async getOutput(txid: string, vout: number): Promise<OrdOutput> {
    return (await this._call('ord_output', [txid, vout])) as OrdOutput
  }

  async getSatByNumber(number: string): Promise<any> {
    return await this._call('ord_sat::by_number', [number])
  }

  async getSatByDecimal(decimal: string): Promise<any> {
    return await this._call('ord_sat::by_decimal', [decimal])
  }

  async getSatByDegree(degree: string): Promise<any> {
    return await this._call('ord_sat::by_degree', [degree])
  }

  async getSatByBase26(base26: string): Promise<any> {
    return await this._call('ord_sat::by_base26', [base26])
  }

  async getSatByPercentage(percentage: string): Promise<any> {
    return await this._call('ord_sat::by_percentage', [percentage])
  }

  async getRuneByName(runeName: string): Promise<any> {
    return await this._call('ord_rune::by_name', [runeName])
  }

  async getRuneById(runeId: string): Promise<any> {
    return await this._call('ord_rune::by_id', [runeId])
  }

  async getRunes(): Promise<any> {
    return await this._call('ord_runes')
  }

  async getOrdData(address: string): Promise<any> {
    return await this._call('ord_data', [address])
  }
}
