import * as bitcoin from 'bitcoinjs-lib'
export type Account = {
  taproot: {
    pubkey: string
    pubKeyXOnly: string
    address: string
    hdPath: string
  }
  nativeSegwit: {
    pubkey: string
    address: string
    hdPath: string
  }
  nestedSegwit: {
    pubkey: string
    address: string
    hdPath: string
  }
  legacy: {
    pubkey: string
    address: string
    hdPath: string
  }
  spendStrategy: SpendStrategy
  network: bitcoin.Network
}

export enum AddressType {
  P2PKH,
  P2TR,
  P2SH_P2WPKH,
  P2WPKH,
}

export type AddressKey = 'nativeSegwit' | 'taproot' | 'nestedSegwit' | 'legacy'

export type WalletStandard =
  | 'bip44_account_last'
  | 'bip44_standard'
  | 'bip32_simple'

export type HDPaths = {
  legacy?: string
  nestedSegwit?: string
  nativeSegwit?: string
  taproot?: string
}

export type SpendStrategy = {
  addressOrder: AddressKey[]
  utxoSortGreatestToLeast: boolean
  changeAddress: AddressKey
}

export type MnemonicToAccountOptions = {
  network?: bitcoin.networks.Network
  index?: number
  spendStrategy?: SpendStrategy
  hdPaths?: HDPaths
}

export type PrivateKeyAccount = {
  legacy: {
    privateKey: string
    hdPath: string
  }
  nestedSegwit: {
    privateKey: string
    hdPath: string
  }
  nativeSegwit: {
    privateKey: string
    hdPath: string
  }
  taproot: {
    privateKey: string
    hdPath: string
  }
}