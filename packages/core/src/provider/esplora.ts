import fetch from 'node-fetch'
import { EsploraTx, EsploraUtxo } from '../types'

export class EsploraRpc {
  public esploraUrl: string

  constructor(url: string) {
    this.esploraUrl = url
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
      cache: 'no-cache',
    }

    try {
      const response = await fetch(this.esploraUrl, requestOptions)
      const responseData = await response.json()

      if (responseData.error) {
        console.error('Esplora JSON-RPC Error:', responseData.error)
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

  async getTxInfo(txid: string): Promise<EsploraTx> {
    return (await this._call('esplora_tx', [txid])) as EsploraTx
  }

  async getTxStatus(txid: string): Promise<any> {
    return await this._call('esplora_tx::status', [txid])
  }

  async getBlockTxids(hash: string): Promise<string[]> {
    return await this._call('esplora_block::txids', [hash])
  }

  async getTxHex(txid: string): Promise<string> {
    return await this._call('esplora_tx::hex', [txid])
  }

  async getTxRaw(txid: string): Promise<any> {
    return await this._call('esplora_tx::raw', [txid])
  }

  async getTxOutspends(txid: string): Promise<Array<{ spent: boolean }>> {
    return (await this._call('esplora_tx::outspends', [txid])) as Array<{ spent: boolean }>
  }

  async getAddressTx(address: string): Promise<any> {
    return await this._call('esplora_address::txs', [address])
  }

  async getAddressTxInMempool(address: string): Promise<EsploraTx[]> {
    return (await this._call('esplora_address::txs:mempool', [address])) as EsploraTx[]
  }

  async getAddressUtxo(address: string): Promise<EsploraUtxo[]> {
    return (await this._call('esplora_address::utxo', [address])) as EsploraUtxo[]
  }

  async getFeeEstimates(): Promise<any> {
    return await this._call('esplora_fee-estimates')
  }
}
