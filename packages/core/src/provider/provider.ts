import * as bitcoin from 'bitcoinjs-lib'
import { SandshrewBitcoinClient } from '@oyl-sdk/rpc-client'
import { EsploraRpc } from '@oyl-sdk/rpc-client'
import { OrdRpc } from '@oyl-sdk/rpc-client'
import { AlkanesRpc } from '@oyl-sdk/rpc-client'
import { waitForTransaction } from '../shared/utils'



export type ProviderConstructorArgs = {
  url: string
  projectId: string
  network: bitcoin.networks.Network
  networkType: 'signet' | 'mainnet' | 'testnet' | 'regtest'
  version?: string
  apiProvider?: any
}

export type PushPsbtArgs = {
  psbtHex?: string
  psbtBase64?: string
}

export type PushPsbtResult = {
  txId: string
  rawTx: string
  size: number
  weight: number
  fee: number
  satsPerVByte: string
} 

export class Provider {
  public sandshrew: SandshrewBitcoinClient
  public esplora: EsploraRpc
  public ord: OrdRpc
  public api: any
  public alkanes: AlkanesRpc
  public network: bitcoin.networks.Network
  public networkType: string
  public url: string

  constructor({
    url,
    projectId,
    network,
    networkType,
    version = 'v1',
    apiProvider,
  }: ProviderConstructorArgs) {
    let isTestnet: boolean
    let isRegtest: boolean
    switch (network) {
      case bitcoin.networks.testnet:
        isTestnet = true
        break
      case bitcoin.networks.regtest:
        isRegtest = true
        break
    }
    const masterUrl = [url, version, projectId].filter(Boolean).join('/')
    this.alkanes = new AlkanesRpc(masterUrl)
    this.sandshrew = new SandshrewBitcoinClient(masterUrl)
    this.esplora = new EsploraRpc(masterUrl)
    this.ord = new OrdRpc(masterUrl)
    this.api = apiProvider
    this.network = network
    this.networkType = networkType
    this.url = masterUrl
  }

  async pushPsbt({ psbtHex, psbtBase64 }: PushPsbtArgs): Promise<PushPsbtResult> {
    if (!psbtHex && !psbtBase64) {
      throw new Error('Please supply psbt in either base64 or hex format')
    }
    if (psbtHex && psbtBase64) {
      throw new Error('Please select one format of psbt to broadcast')
    }

    let psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: this.network })

    if (psbtHex) {
      psbt = bitcoin.Psbt.fromHex(psbtHex, {
        network: this.network,
      })
    }

    if (psbtBase64) {
      psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
        network: this.network,
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
    const [result] = await this.sandshrew.bitcoindRpc.testMemPoolAccept!([rawTx])

    if (!result.allowed) {
      throw new Error(result['reject-reason'])
    }
    await this.sandshrew.bitcoindRpc.sendRawTransaction!(rawTx)

    await waitForTransaction({
      txId,
      sandshrewBtcClient: this.sandshrew,
    })

    const txInMemPool = await this.sandshrew.bitcoindRpc.getMemPoolEntry!(txId)
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
} 