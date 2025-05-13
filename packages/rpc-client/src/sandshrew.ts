import fetch from 'node-fetch'
import { IRpcMethods } from '../shared/interface'
import { IBitcoinProvider } from '../interfaces'

export class SandshrewBitcoinClient implements IBitcoinProvider {
  public apiUrl: string
  public bitcoindRpc: IRpcMethods = {}

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
    this._initializeRpcMethods()
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
      const response = await fetch(this.apiUrl, requestOptions)
      const responseData = await response.json()
      if (responseData.error) {
        console.error('JSON-RPC Error:', responseData.error)
        throw new Error(responseData.error)
      }
      return responseData.result
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request Timeout:', error)
        throw new Error('Request timed out')
      } else {
        console.error('Request Error:', error)
        throw error
      }
    }
  }

  // IBitcoinProvider implementation
  async getBlockCount(): Promise<number> {
    return this.bitcoindRpc.getBlockCount()
  }

  async getRawTransaction(txid: string): Promise<string> {
    return this.bitcoindRpc.getRawTransaction(txid)
  }

  async getBlockHash(height: number): Promise<string> {
    return this.bitcoindRpc.getBlockHash(height)
  }

  async getBlock(blockhash: string): Promise<any> {
    return this.bitcoindRpc.getBlock(blockhash)
  }

  async getBlockHeader(blockhash: string): Promise<any> {
    return this.bitcoindRpc.getBlockHeader(blockhash)
  }

  async getBlockStats(blockhash: string): Promise<any> {
    return this.bitcoindRpc.getBlockStats(blockhash)
  }

  async getChainTips(): Promise<any[]> {
    return this.bitcoindRpc.getChainTips()
  }

  async getDifficulty(): Promise<number> {
    return this.bitcoindRpc.getDifficulty()
  }

  async getMempoolInfo(): Promise<any> {
    return this.bitcoindRpc.getMemPoolInfo()
  }

  async getMiningInfo(): Promise<any> {
    return this.bitcoindRpc.getMiningInfo()
  }

  async getNetworkInfo(): Promise<any> {
    return this.bitcoindRpc.getNetworkInfo()
  }

  async getTxOut(txid: string, vout: number): Promise<any> {
    return this.bitcoindRpc.getTxOut(txid, vout)
  }

  async getTxOutSetInfo(): Promise<any> {
    return this.bitcoindRpc.getTxOutSetInfo()
  }

  async verifyChain(): Promise<boolean> {
    return this.bitcoindRpc.verifyChain()
  }

  // Helper methods
  async getBlockTimeByHeight(blockHeight: number) {
    const blockData = await this._call('getblockhash', [blockHeight])
    const block = await this._call('getblock', [blockData])
    return block.time
  }

  async multiCall(parameters: (string | string[] | object | object[])[][]) {
    return await this._call('sandshrew_multicall', parameters)
  }

  _initializeRpcMethods() {
    const rpcMethods = {
      abandonTransaction: 'str',
      abortRescan: '',
      addMultiSigAddress: '',
      addNode: '',
      analyzePSBT: 'str',
      backupWallet: '',
      bumpFee: 'str',
      clearBanned: '',
      combinePSBT: 'obj',
      combineRawTransaction: 'obj',
      convertToPSBT: 'str',
      createMultiSig: '',
      createPSBT: 'obj',
      createRawTransaction: 'obj obj',
      createWallet: 'str',
      decodePSBT: 'str',
      decodeScript: 'str',
      decodeRawTransaction: 'str',
      deriveAddresses: 'str',
      disconnectNode: '',
      dumpPrivKey: '',
      dumpWallet: 'str',
      encryptWallet: '',
      enumerateSigners: '',
      estimateSmartFee: 'int str',
      generateBlock: 'str obj',
      generateToAddress: 'int str',
      generateToDescriptor: 'int str',
      getAddedNodeInfo: '',
      getAddressesByLabel: 'str',
      getAddressInfo: 'str',
      getBalance: 'str int',
      getBalances: '',
      getBestBlockHash: '',
      getBlock: 'str int',
      getBlockchainInfo: '',
      getBlockCount: '',
      getBlockFilter: 'str',
      getBlockHash: 'int',
      getBlockHeader: 'str',
      getBlockStats: 'str',
      getBlockTemplate: '',
      getConnectionCount: '',
      getChainTips: '',
      getChainTxStats: '',
      getDescriptorInfo: 'str',
      getIndexInfo: '',
      getMemoryInfo: '',
      getMemPoolAncestors: 'str',
      getMemPoolDescendants: 'str',
      getMemPoolEntry: 'str',
      getMemPoolInfo: '',
      getNetTotals: '',
      getNetworkHashPS: '',
      getNetworkInfo: '',
      getNewAddress: 'str str',
      getNodeAddresses: '',
      getPeerInfo: '',
      getRawChangeAddress: '',
      getRawMemPool: 'bool',
      getRawTransaction: 'str int',
      getReceivedByAddress: 'str int',
      getReceivedByLabel: 'str',
      getRpcInfo: '',
      getSpentInfo: 'obj',
      getTransaction: '',
      getTxOut: 'str int bool',
      getTxOutProof: '',
      getTxOutSetInfo: '',
      getUnconfirmedBalance: '',
      getWalletInfo: '',
      getWork: '',
      getZmqNotifications: '',
      finalizePSBT: 'str',
      fundRawTransaction: 'str',
      help: '',
      importAddress: 'str str bool',
      importDescriptors: 'str',
      importMulti: 'obj obj',
      importPrivKey: 'str str bool',
      importPrunedFunds: 'str, str',
      importPubKey: 'str',
      importWallet: 'str',
      invalidateBlock: 'str',
      joinPSBTs: 'obj',
      keyPoolRefill: '',
      listAccounts: 'int',
      listAddressGroupings: '',
      listBanned: '',
      listDescriptors: '',
      listLabels: '',
      listLockUnspent: 'bool',
      listReceivedByAccount: 'int bool',
      listReceivedByAddress: 'int bool',
      listReceivedByLabel: '',
      listSinceBlock: 'str int',
      listTransactions: 'str int int',
      listUnspent: 'int int',
      listWalletDir: '',
      listWallets: '',
      loadWallet: 'str',
      lockUnspent: '',
      logging: '',
      move: 'str str float int str',
      ping: '',
      preciousBlock: 'str',
      prioritiseTransaction: 'str float int',
      pruneBlockChain: 'int',
      psbtBumpFee: 'str',
      removePrunedFunds: 'str',
      reScanBlockChain: '',
      saveMemPool: '',
      send: 'obj',
      setHDSeed: '',
      setLabel: 'str str',
      setWalletFlag: 'str',
      scanTxOutSet: 'str',
      sendFrom: 'str str float int str str',
      sendRawTransaction: 'str',
      sendToAddress: 'str float str str',
      setAccount: '',
      setBan: 'str str',
      setNetworkActive: 'bool',
      setGenerate: 'bool int',
      setTxFee: 'float',
      signMessage: '',
      signMessageWithPrivKey: 'str str',
      signRawTransaction: '',
      signRawTransactionWithKey: 'str obj',
      signRawTransactionWithWallet: 'str',
      stop: '',
      submitBlock: 'str',
      submitHeader: 'str',
      testMemPoolAccept: 'obj',
      unloadWallet: '',
      upgradeWallet: '',
      uptime: '',
      utxoUpdatePSBT: 'str',
      validateAddress: '',
      verifyMessage: '',
      verifyTxOutProof: 'str',
      walletCreateFundedPSBT: '',
      walletDisplayAddress: 'str',
      walletLock: '',
      walletPassPhrase: 'string int',
      walletPassphraseChange: '',
      walletProcessPSBT: 'str',
    }

    for (const methodName in rpcMethods) {
      this._createRpcMethod(methodName, rpcMethods[methodName])
    }
  }

  _createRpcMethod(methodName, argType) {
    this.bitcoindRpc[methodName] = async (...args) => {
      const convertedArgs = args.map((arg, index) => {
        return this._convertArg(arg, argType)
      })

      return this._call('btc_' + methodName.toLowerCase(), convertedArgs)
    }
  }

  _convertArg(arg, argType) {
    switch (argType) {
      case 'str':
        return arg.toString()
      case 'int':
        return parseFloat(arg)
      case 'float':
        return parseFloat(arg)
      case 'bool':
        return (
          arg === true ||
          arg == '1' ||
          arg == 'true' ||
          arg.toString().toLowerCase() == 'true'
        )
      case 'obj':
        if (typeof arg === 'string') {
          return JSON.parse(arg)
        }
        return arg
      default:
        return arg
    }
  }
}
