import { IProvider } from '../../../../src/rpclient/interfaces';
import { SandshrewBitcoinClient } from '../../../../src/rpclient/sandshrew';
import { EsploraRpc } from '../../../../src/rpclient/esplora';
import { OrdRpc } from '../ord';
import { AlkanesRpc } from '../alkanes';

export class DefaultProvider implements IProvider {
  public bitcoin: SandshrewBitcoinClient;
  public esplora: EsploraRpc;
  public ord: OrdRpc;
  public alkanes: AlkanesRpc;

  constructor(url: string) {
    this.bitcoin = new SandshrewBitcoinClient(url);
    this.esplora = new EsploraRpc(url);
    this.ord = new OrdRpc(url);
    this.alkanes = new AlkanesRpc(url);
  }
} 