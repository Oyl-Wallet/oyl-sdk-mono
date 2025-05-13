import { DefaultProvider } from '@oyl-sdk/rpc-client';
import { BitcoinClient } from '@oyl-sdk/btc';

export interface ProviderConfig {
  bitcoin?: {
    url: string;
    username?: string;
    password?: string;
  };
  esplora?: {
    url: string;
  };
  ord?: {
    url: string;
  };
  alkanes?: {
    url: string;
  };
}

export class Provider {
  private static instance: Provider;
  private provider: DefaultProvider;
  private bitcoinClient: BitcoinClient;

  private constructor(config: ProviderConfig) {
    this.provider = new DefaultProvider(config);
    this.bitcoinClient = new BitcoinClient(config.bitcoin);
  }

  public static getInstance(config?: ProviderConfig): Provider {
    if (!Provider.instance) {
      if (!config) {
        throw new Error('Provider configuration is required for initialization');
      }
      Provider.instance = new Provider(config);
    }
    return Provider.instance;
  }

  public get bitcoin() {
    return this.bitcoinClient;
  }

  public get esplora() {
    return this.provider.esplora;
  }

  public get ord() {
    return this.provider.ord;
  }

  public get alkanes() {
    return this.provider.alkanes;
  }
} 