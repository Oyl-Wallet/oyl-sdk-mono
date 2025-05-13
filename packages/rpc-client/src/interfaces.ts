export interface EsploraTx {
  txid: string
  version: number
  locktime: number
  vin: Array<{
    txid: string
    vout: number
    prevout: {
      scriptpubkey: string
      scriptpubkey_asm: string
      scriptpubkey_type: string
      scriptpubkey_address: string
      value: number
    }
    scriptsig: string
    scriptsig_asm: string
    witness: Array<string>
    is_coinbase: boolean
    sequence: number
  }>
  vout: Array<{
    scriptpubkey: string
    scriptpubkey_asm: string
    scriptpubkey_type: string
    scriptpubkey_address: string
    value: number
  }>
  size: number
  weight: number
  fee: number
  status: {
    confirmed: boolean
    block_height: number
    block_hash: string
    block_time: number
  }
}

export interface EsploraUtxo {
  txid: string
  vout: number
  status: {
    confirmed: boolean
    block_height?: number
    block_hash?: string
    block_time?: number
  }
  value: number
}

export interface OrdOutputRune {
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

export interface Rune {
  rune: {
    id: { block: string; tx: string }
    name: string
    spacedName: string
    divisibility: number
    spacers: number
    symbol: string
  }
  balance: string
}

export interface Outpoint {
  runes: Rune[]
  outpoint: { txid: string; vout: number }
  output: { value: string; script: string }
  txindex: number
  height: number
}

export interface AlkanesResponse {
  outpoints: Outpoint[]
  balanceSheet: []
}

export interface IBitcoinProvider {
  getBlockCount(): Promise<number>;
  getRawTransaction(txid: string): Promise<string>;
  getBlockHash(height: number): Promise<string>;
  getBlock(blockhash: string): Promise<any>;
  getBlockHeader(blockhash: string): Promise<any>;
  getBlockStats(blockhash: string): Promise<any>;
  getChainTips(): Promise<any[]>;
  getDifficulty(): Promise<number>;
  getMempoolInfo(): Promise<any>;
  getMiningInfo(): Promise<any>;
  getNetworkInfo(): Promise<any>;
  getTxOut(txid: string, vout: number): Promise<any>;
  getTxOutSetInfo(): Promise<any>;
  verifyChain(): Promise<boolean>;
}

export interface IEsploraProvider {
  getTxInfo(txid: string): Promise<EsploraTx>;
  getTxStatus(txid: string): Promise<any>;
  getBlockTxids(hash: string): Promise<string[]>;
  getTxHex(txid: string): Promise<string>;
  getTxRaw(txid: string): Promise<any>;
  getTxOutspends(txid: string): Promise<Array<{ spent: boolean }>>;
  getAddressTx(address: string): Promise<any>;
  getAddressTxInMempool(address: string): Promise<EsploraTx[]>;
  getAddressUtxo(address: string): Promise<EsploraUtxo[]>;
  getFeeEstimates(): Promise<any>;
}

export interface IOrdProvider {
  getInscriptionById(inscriptionId: string): Promise<any>;
  getInscriptionContent(inscriptionId: string): Promise<any>;
  getInscriptionByNumber(number: string): Promise<any>;
  getInscriptions(startingNumber?: string): Promise<any>;
  getInscriptionsByBlockHash(blockHash: string): Promise<any>;
  getInscriptionsByBlockHeight(blockHeight: string): Promise<any>;
  getInscriptionBySat(satNumber: string): Promise<any>;
  getInscriptionBySatWithIndex(satNumber: string, index?: string): Promise<any>;
  getInscriptionChildren(inscriptionId: string, page?: string): Promise<any>;
  getInscriptionMetaData(inscriptionId: string): Promise<any>;
  getOutput(txid: string, vout: number): Promise<OrdOutput>;
  getSatByNumber(number: string): Promise<any>;
  getSatByDecimal(decimal: string): Promise<any>;
  getSatByDegree(degree: string): Promise<any>;
  getSatByBase26(base26: string): Promise<any>;
  getSatByPercentage(percentage: string): Promise<any>;
  getRuneByName(runeName: string): Promise<any>;
  getRuneById(runeId: string): Promise<any>;
  getRunes(): Promise<any>;
  getOrdData(address: string): Promise<any>;
}

export interface IAlkanesProvider {
  getAlkanesByHeight(params: { height: number; protocolTag?: string }): Promise<AlkanesResponse>;
  getAlkanesByAddress(params: { address: string; protocolTag?: string; name?: string }): Promise<Outpoint[]>;
  getAlkanesByOutpoint(params: { txid: string; vout: number; protocolTag?: string; height?: string }): Promise<any>;
  getAlkaneById(params: { block: string; tx: string }): Promise<any>;
  getAlkanes(params: { limit: number; offset?: number }): Promise<any[]>;
  trace(params: { vout: number; txid: string }): Promise<any>;
  simulate(request: Partial<any>, decoder?: any): Promise<any>;
  simulatePoolInfo(request: any): Promise<any>;
  previewRemoveLiquidity(params: { token: any; tokenAmount: bigint }): Promise<any>;
  meta(request: Partial<any>, decoder?: any): Promise<any>;
}

export interface IProvider {
  bitcoin: IBitcoinProvider;
  esplora: IEsploraProvider;
  ord: IOrdProvider;
  alkanes: IAlkanesProvider;
} 