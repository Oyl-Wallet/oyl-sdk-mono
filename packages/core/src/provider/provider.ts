import * as bitcoin from 'bitcoinjs-lib'
import { SandshrewBitcoinClient } from '../rpc/sandshrew'
import { EsploraRpc } from '../rpc/esplora'
import { OrdRpc } from '../rpc/ord'
import { AlkanesRpc } from '../rpc/alkanes'
import { BaseProvider, BaseProviderConfig } from './base'

export class Provider extends BaseProvider {
  public sandshrew: SandshrewBitcoinClient
  public esplora: EsploraRpc
  public ord: OrdRpc
  public alkanes: AlkanesRpc
  public network: bitcoin.networks.Network

  constructor({
    url,
    projectId,
    network,
    networkType,
    version = 'v1'
  }: BaseProviderConfig) {
    super({ url, projectId, network, networkType, version })
    this.sandshrew = new SandshrewBitcoinClient(this.url)
    this.esplora = new EsploraRpc(this.url)
    this.ord = new OrdRpc(this.url)
    this.alkanes = new AlkanesRpc(this.url)
    this.network = network
  }

  getNetwork() {
    return this.network
  }

  getNetworkType() {
    return this.networkType
  }

  getUrl() {
    return this.url
  }
} 