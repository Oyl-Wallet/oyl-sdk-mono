import { IProvider, IBitcoinProvider, IEsploraProvider, IOrdProvider, IAlkanesProvider } from '../../../../src/rpclient/interfaces';
import { EsploraTx, EsploraUtxo, OrdOutput, Outpoint } from '../../../../src/rpclient/interfaces';

export abstract class BaseBitcoinProvider implements IBitcoinProvider {
  protected url: string;
  
  constructor(url: string) {
    this.url = url;
  }

  abstract getBlockCount(): Promise<number>;
  abstract getRawTransaction(txid: string): Promise<string>;
  abstract getBlockHash(height: number): Promise<string>;
  abstract getBlock(blockhash: string): Promise<any>;
  abstract getBlockHeader(blockhash: string): Promise<any>;
  abstract getBlockStats(blockhash: string): Promise<any>;
  abstract getChainTips(): Promise<any[]>;
  abstract getDifficulty(): Promise<number>;
  abstract getMempoolInfo(): Promise<any>;
  abstract getMiningInfo(): Promise<any>;
  abstract getNetworkInfo(): Promise<any>;
  abstract getTxOut(txid: string, vout: number): Promise<any>;
  abstract getTxOutSetInfo(): Promise<any>;
  abstract verifyChain(): Promise<boolean>;
}

export abstract class BaseEsploraProvider implements IEsploraProvider {
  protected url: string;
  
  constructor(url: string) {
    this.url = url;
  }

  abstract getTxInfo(txid: string): Promise<EsploraTx>;
  abstract getTxStatus(txid: string): Promise<any>;
  abstract getBlockTxids(hash: string): Promise<string[]>;
  abstract getTxHex(txid: string): Promise<string>;
  abstract getTxRaw(txid: string): Promise<any>;
  abstract getTxOutspends(txid: string): Promise<Array<{ spent: boolean }>>;
  abstract getAddressTx(address: string): Promise<any>;
  abstract getAddressTxInMempool(address: string): Promise<EsploraTx[]>;
  abstract getAddressUtxo(address: string): Promise<EsploraUtxo[]>;
  abstract getFeeEstimates(): Promise<any>;
}

export abstract class BaseOrdProvider implements IOrdProvider {
  protected url: string;
  
  constructor(url: string) {
    this.url = url;
  }

  abstract getInscriptionById(inscriptionId: string): Promise<any>;
  abstract getInscriptionContent(inscriptionId: string): Promise<any>;
  abstract getInscriptionByNumber(number: string): Promise<any>;
  abstract getInscriptions(startingNumber?: string): Promise<any>;
  abstract getInscriptionsByBlockHash(blockHash: string): Promise<any>;
  abstract getInscriptionsByBlockHeight(blockHeight: string): Promise<any>;
  abstract getInscriptionBySat(satNumber: string): Promise<any>;
  abstract getInscriptionBySatWithIndex(satNumber: string, index?: string): Promise<any>;
  abstract getInscriptionChildren(inscriptionId: string, page?: string): Promise<any>;
  abstract getInscriptionMetaData(inscriptionId: string): Promise<any>;
  abstract getOutput(txid: string, vout: number): Promise<OrdOutput>;
  abstract getSatByNumber(number: string): Promise<any>;
  abstract getSatByDecimal(decimal: string): Promise<any>;
  abstract getSatByDegree(degree: string): Promise<any>;
  abstract getSatByBase26(base26: string): Promise<any>;
  abstract getSatByPercentage(percentage: string): Promise<any>;
  abstract getRuneByName(runeName: string): Promise<any>;
  abstract getRuneById(runeId: string): Promise<any>;
  abstract getRunes(): Promise<any>;
  abstract getOrdData(address: string): Promise<any>;
}

export abstract class BaseAlkanesProvider implements IAlkanesProvider {
  protected url: string;
  
  constructor(url: string) {
    this.url = url;
  }

  abstract getAlkanesByHeight(params: { height: number; protocolTag?: string }): Promise<any>;
  abstract getAlkanesByAddress(params: { address: string; protocolTag?: string; name?: string }): Promise<Outpoint[]>;
  abstract getAlkanesByOutpoint(params: { txid: string; vout: number; protocolTag?: string; height?: string }): Promise<any>;
  abstract getAlkaneById(params: { block: string; tx: string }): Promise<any>;
  abstract getAlkanes(params: { limit: number; offset?: number }): Promise<any[]>;
  abstract trace(params: { vout: number; txid: string }): Promise<any>;
  abstract simulate(request: Partial<any>, decoder?: any): Promise<any>;
  abstract simulatePoolInfo(request: any): Promise<any>;
  abstract previewRemoveLiquidity(params: { token: any; tokenAmount: bigint }): Promise<any>;
  abstract meta(request: Partial<any>, decoder?: any): Promise<any>;
}

export abstract class BaseProvider implements IProvider {
  abstract bitcoin: IBitcoinProvider;
  abstract esplora: IEsploraProvider;
  abstract ord: IOrdProvider;
  abstract alkanes: IAlkanesProvider;
} 