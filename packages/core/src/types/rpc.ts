import { OrdOutput } from "./ord"
import { AlkanesResponse, Rune } from "./alkanes"
import { EsploraUtxo } from "./utxo"
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

export interface Outpoint {
  runes: Rune[]
  outpoint: { txid: string; vout: number }
  output: { value: string; script: string }
  txindex: number
  height: number
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

export interface IRpcMethods {
  abandonTransaction?(arg: string): Promise<any>
  abortRescan?(): Promise<any>
  addMultiSigAddress?(): Promise<any>
  addNode?(): Promise<any>
  analyzePSBT?(arg: string): Promise<any>
  backupWallet?(): Promise<any>
  bumpFee?(arg: string): Promise<any>
  clearBanned?(): Promise<any>
  combinePSBT?(arg: object): Promise<any>
  combineRawTransaction?(arg: object): Promise<any>
  convertToPSBT?(arg: string): Promise<any>
  createMultiSig?(): Promise<any>
  createPSBT?(arg: object): Promise<any>
  createRawTransaction?(arg1: object, arg2: object): Promise<any>
  createWallet?(arg: string): Promise<any>
  decodePSBT?(arg: string): Promise<any>
  decodeScript?(arg: string): Promise<any>
  decodeRawTransaction?(arg: string): Promise<any>
  deriveAddresses?(arg: string): Promise<any>
  disconnectNode?(): Promise<any>
  dumpPrivKey?(): Promise<any>
  dumpWallet?(arg: string): Promise<any>
  encryptWallet?(): Promise<any>
  enumerateSigners?(): Promise<any>
  estimateSmartFee?(arg1: number, arg2: string): Promise<any>
  generateBlock?(arg1: string, arg2: object): Promise<any>
  generateToAddress?(arg1: number, arg2: string): Promise<any>
  generateToDescriptor?(arg1: number, arg2: string): Promise<any>
  getAddedNodeInfo?(): Promise<any>
  getAddressesByLabel?(arg: string): Promise<any>
  getAddressInfo?(arg: string): Promise<any>
  getBalance?(arg1: string, arg2: number): Promise<any>
  getBalances?(): Promise<any>
  getBestBlockHash?(): Promise<any>
  getBlock?(arg1: string, arg2?: number): Promise<any>
  getBlockchainInfo?(): Promise<any>
  getBlockCount?(): Promise<any>
  getBlockHash?(arg1: number): Promise<any>
  getBlockFilter?(arg: string): Promise<any>
  getBlockHeader?(arg: string): Promise<any>
  getBlockStats?(arg: string): Promise<any>
  getBlockTemplate?(): Promise<any>
  getConnectionCount?(): Promise<any>
  getChainTips?(): Promise<any>
  getChainTxStats?(): Promise<any>
  getDescriptorInfo?(arg: string): Promise<any>
  getDifficulty?(): Promise<any>
  getIndexInfo?(): Promise<any>
  getMemoryInfo?(): Promise<any>
  getMemPoolAncestors?(arg: string): Promise<any>
  getMemPoolDescendants?(arg: string): Promise<any>
  getMemPoolEntry?(arg: string): Promise<any>
  getMemPoolInfo?(): Promise<any>
  getMiningInfo?(): Promise<any>
  getNetTotals?(): Promise<any>
  getNetworkHashPS?(): Promise<any>
  getNetworkInfo?(): Promise<any>
  getNewAddress?(arg1: string, arg2: string): Promise<any>
  getNodeAddresses?(): Promise<any>
  getPeerInfo?(): Promise<any>
  getRawChangeAddress?(): Promise<any>
  getRawMemPool?(arg: boolean): Promise<any>
  getRawTransaction?(arg1: string, arg2: number): Promise<any>
  getReceivedByAddress?(arg1: string, arg2: number): Promise<any>
  getReceivedByLabel?(arg: string): Promise<any>
  getRpcInfo?(): Promise<any>
  getSpentInfo?(arg: object): Promise<any>
  getTransaction?(): Promise<any>
  getTxOut?(arg1: string, arg2: number, arg3: boolean): Promise<any>
  getTxOutProof?(): Promise<any>
  getTxOutSetInfo?(): Promise<any>
  getUnconfirmedBalance?(): Promise<any>
  getWalletInfo?(): Promise<any>
  getWork?(): Promise<any>
  getZmqNotifications?(): Promise<any>
  finalizePSBT?(arg: string): Promise<any>
  fundRawTransaction?(arg: string): Promise<any>
  help?(): Promise<any>
  importAddress?(arg1: string, arg2: string, arg3: boolean): Promise<any>
  importDescriptors?(arg: string): Promise<any>
  importMulti?(arg1: object, arg2: object): Promise<any>
  importPrivKey?(arg1: string, arg2: string, arg3: boolean): Promise<any>
  importPrunedFunds?(arg1: string, arg2: string): Promise<any>
  importPubKey?(arg: string): Promise<any>
  importWallet?(arg: string): Promise<any>
  invalidateBlock?(arg: string): Promise<any>
  joinPSBTs?(arg: object): Promise<any>
  keyPoolRefill?(): Promise<any>
  listAccounts?(arg: number): Promise<any>
  listAddressGroupings?(): Promise<any>
  listBanned?(): Promise<any>
  listDescriptors?(): Promise<any>
  listLabels?(): Promise<any>
  listLockUnspent?(arg: boolean): Promise<any>
  listReceivedByAccount?(arg1: number, arg2: boolean): Promise<any>
  listReceivedByAddress?(arg1: number, arg2: boolean): Promise<any>
  listReceivedByLabel?(): Promise<any>
  listSinceBlock?(arg1: string, arg2: number): Promise<any>
  listTransactions?(arg1: string, arg2: number, arg3: number): Promise<any>
  listUnspent?(
    arg1: number | undefined,
    arg2: number | undefined,
    arg3: string[]
  ): Promise<any>
  listWalletDir?(): Promise<any>
  listWallets?(): Promise<any>
  loadWallet?(arg: string): Promise<any>
  lockUnspent?(): Promise<any>
  logging?(): Promise<any>
  move?(
    arg1: string,
    arg2: string,
    arg3: number,
    arg4: number,
    arg5: string
  ): Promise<any>
  ping?(): Promise<any>
  preciousBlock?(arg: string): Promise<any>
  prioritiseTransaction?(arg1: string, arg2: number, arg3: number): Promise<any>
  pruneBlockChain?(arg: number): Promise<any>
  psbtBumpFee?(arg: string): Promise<any>
  removePrunedFunds?(arg: string): Promise<any>
  reScanBlockChain?(): Promise<any>
  saveMemPool?(): Promise<any>
  send?(arg: object): Promise<any>
  setHDSeed?(): Promise<any>
  setLabel?(arg1: string, arg2: string): Promise<any>
  setWalletFlag?(arg: string): Promise<any>
  scanTxOutSet?(arg: string): Promise<any>
  sendFrom?(
    arg1: string,
    arg2: string,
    arg3: number,
    arg4: number,
    arg5: string,
    arg6: string
  ): Promise<any>
  sendRawTransaction?(arg: string): Promise<any>
  sendToAddress?(
    arg1: string,
    arg2: number,
    arg3: string,
    arg4: string
  ): Promise<any>
  setAccount?(): Promise<any>
  setBan?(arg1: string, arg2: string): Promise<any>
  setNetworkActive?(arg: boolean): Promise<any>
  setGenerate?(arg1: boolean, arg2: number): Promise<any>
  setTxFee?(arg: number): Promise<any>
  signMessage?(): Promise<any>
  signMessageWithPrivKey?(arg1: string, arg2: string): Promise<any>
  signRawTransaction?(): Promise<any>
  signRawTransactionWithKey?(arg1: string, arg2: object): Promise<any>
  signRawTransactionWithWallet?(arg: string): Promise<any>
  stop?(): Promise<any>
  submitBlock?(arg: string): Promise<any>
  submitHeader?(arg: string): Promise<any>
  testMemPoolAccept?(arg: object): Promise<any>
  unloadWallet?(): Promise<any>
  upgradeWallet?(): Promise<any>
  uptime?(): Promise<any>
  utxoUpdatePSBT?(arg: string): Promise<any>
  validateAddress?(): Promise<any>
  verifyChain?(): Promise<any>
  verifyMessage?(): Promise<any>
  verifyTxOutProof?(): Promise<any>
  walletCreateFundedPSBT?(): Promise<any>
  walletDisplayAddress?(arg: string): Promise<any>
  walletLock?(): Promise<any>
  walletPassphraseChange?(): Promise<any>
  walletProcessPSBT?(arg: string): Promise<any>
}