export type AlkaneId = {
  block: string
  tx: string
}

export type Rune = {
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

export type ProtoRunesToken = {
  id: AlkaneId
  name: string
  symbol: string
}

export interface AlkanesOutpoint {
  runes: Rune[]
  outpoint: { txid: string; vout: number }
  output: { value: string; script: string }
  txindex: number
  height: number
}

export type AlkanesByAddressResponse = {
  outpoints: AlkanesOutpoint[]
}

export type AlkaneSimulateRequest = {
  alkanes: any[]
  transaction: string
  block: string
  height: string
  txindex: number
  target: {
    block: string
    tx: string
  }
  inputs: string[]
  pointer: number
  refundPointer: number
  vout: number
}

export type AlkaneToken = {
  name: string
  symbol: string
  totalSupply: number
  cap: number
  minted: number
  mintActive: boolean
  percentageMinted: number
  mintAmount: number
}

export type AlkanesPayload = {
  body: Uint8Array
  cursed: boolean
  tags: { contentType: string }
}


export type AlkanesResponse = {
  outpoints: Array<{
    runes: Array<{
      rune: {
        id: {
          block: string
          tx: string
        }
        name: string
        spacedName: string
        divisibility: number
        spacers: number
        symbol: string
      }
      balance: string
    }>
    outpoint: {
      txid: string
      vout: number
    }
    output: {
      value: string
      script: string
    }
    txindex: number
    height: number
  }>
}