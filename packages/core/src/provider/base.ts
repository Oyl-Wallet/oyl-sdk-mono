import * as bitcoin from 'bitcoinjs-lib'

export type BaseProviderConfig = {
  url: string
  projectId: string
  network: bitcoin.networks.Network
  networkType: 'signet' | 'mainnet' | 'testnet' | 'regtest'
  version?: string
}

export abstract class BaseProvider {
  protected url: string
  public network: bitcoin.networks.Network
  protected networkType: string

  constructor({
    url,
    projectId,
    network,
    networkType,
    version = 'v1'
  }: BaseProviderConfig) {
    this.url = [url, version, projectId].filter(Boolean).join('/')
    this.network = network
    this.networkType = networkType
  }

  abstract getNetwork(): bitcoin.networks.Network
  abstract getNetworkType(): string
  abstract getUrl(): string
} 