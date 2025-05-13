import * as bitcoin from 'bitcoinjs-lib'
import ecc from '@bitcoinerlab/secp256k1'
import { BIP32Factory } from 'bip32'
import * as bip39 from 'bip39'

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

export interface SpendStrategy {
  addressOrder: AddressKey[]
  utxoSortGreatestToLeast: boolean
  changeAddress: AddressKey
}

export interface MnemonicToAccountOptions {
  network?: bitcoin.networks.Network
  index?: number
  spendStrategy?: SpendStrategy
  hdPaths?: HDPaths
}

export interface PrivateKeyAccount {
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

export interface PrivateKeyAccount {
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

const bip32 = BIP32Factory(ecc)
bitcoin.initEccLib(ecc)

export const generateMnemonic = (bitsize?: 128 | 256) => {
  if (bitsize && bitsize !== 128 && bitsize !== 256) {
    throw new Error('Bitsize must be either 128 or 256')
  }
  return bitsize === 256 ? bip39.generateMnemonic(256) : bip39.generateMnemonic()
}

export const validateMnemonic = (mnemonic: string) => {
  return bip39.validateMnemonic(mnemonic)
}

export const getHDPaths = (
  index: number = 0,
  network = bitcoin.networks.bitcoin,
  walletStandard: WalletStandard = 'bip44_account_last'
): HDPaths => {
  const coinType = network === bitcoin.networks.testnet ? '1' : '0'

  switch (walletStandard) {
    case 'bip44_standard':
      return {
        legacy: `m/44'/${coinType}'/${index}'/0/0`,
        nestedSegwit: `m/49'/${coinType}'/${index}'/0/0`,
        nativeSegwit: `m/84'/${coinType}'/${index}'/0/0`,
        taproot: `m/86'/${coinType}'/${index}'/0/0`,
      }

    case 'bip32_simple':
      return {
        legacy: `m/44'/${coinType}'/${index}'/0`,
        nestedSegwit: `m/49'/${coinType}'/${index}'/0`,
        nativeSegwit: `m/84'/${coinType}'/${index}'/0`,
        taproot: `m/86'/${coinType}'/${index}'/0`,
      }

    case 'bip44_account_last':
    default:
      return {
        legacy: `m/44'/${coinType}'/0'/0/${index}`,
        nestedSegwit: `m/49'/${coinType}'/0'/0/${index}`,
        nativeSegwit: `m/84'/${coinType}'/0'/0/${index}`,
        taproot: `m/86'/${coinType}'/0'/0/${index}`,
      }
  }
}

export const generateWallet = ({
  mnemonic,
  opts,
}: {
  mnemonic?: string
  opts: MnemonicToAccountOptions
}): Account => {
  const toXOnly = (pubKey: Buffer) =>
    pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)

  if (!mnemonic) {
    throw Error('mnemonic not given')
  }

  const hdPaths = {
    ...getHDPaths(opts.index, opts.network),
    ...opts.hdPaths,
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)

  // Legacy
  const childLegacy = root.derivePath(hdPaths.legacy!)
  const pubkeyLegacy = childLegacy.publicKey
  const addressLegacy = bitcoin.payments.p2pkh({
    pubkey: pubkeyLegacy,
    network: opts.network,
  })
  const legacy = {
    pubkey: pubkeyLegacy.toString('hex'),
    address: addressLegacy.address!,
    hdPath: hdPaths.legacy!,
  }

  // Nested Segwit
  const childSegwitNested = root.derivePath(hdPaths.nestedSegwit!)
  const pubkeySegwitNested = childSegwitNested.publicKey
  const addressSegwitNested = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wpkh({
      pubkey: pubkeySegwitNested,
      network: opts.network,
    }),
  })
  const nestedSegwit = {
    pubkey: pubkeySegwitNested.toString('hex'),
    address: addressSegwitNested.address!,
    hdPath: hdPaths.nestedSegwit!,
  }

  // Native Segwit
  const childSegwit = root.derivePath(hdPaths.nativeSegwit!)
  const pubkeySegwit = childSegwit.publicKey
  const addressSegwit = bitcoin.payments.p2wpkh({
    pubkey: pubkeySegwit,
    network: opts.network,
  })
  const nativeSegwit = {
    pubkey: pubkeySegwit.toString('hex'),
    address: addressSegwit.address!,
    hdPath: hdPaths.nativeSegwit!,
  }

  // Taproot
  const childTaproot = root.derivePath(hdPaths.taproot!)
  const pubkeyTaproot = childTaproot.publicKey
  const pubkeyTaprootXOnly = toXOnly(pubkeyTaproot)

  const addressTaproot = bitcoin.payments.p2tr({
    internalPubkey: pubkeyTaprootXOnly,
    network: opts.network,
  })
  const taproot = {
    pubkey: pubkeyTaproot.toString('hex'),
    pubKeyXOnly: pubkeyTaprootXOnly.toString('hex'),
    address: addressTaproot.address!,
    hdPath: hdPaths.taproot!,
  }

  return {
    taproot,
    nativeSegwit,
    nestedSegwit,
    legacy,
    spendStrategy: opts.spendStrategy!,
    network: opts.network!,
  }
}

export const mnemonicToAccount = ({
  mnemonic = generateMnemonic(),
  opts,
}: {
  mnemonic?: string
  opts?: MnemonicToAccountOptions
}): Account => {
  const options = {
    network: opts?.network ? opts.network : bitcoin.networks.bitcoin,
    index: opts?.index ? opts.index : 0,
    hdPaths: opts?.hdPaths,
    spendStrategy: {
      addressOrder: opts?.spendStrategy?.addressOrder
        ? opts.spendStrategy.addressOrder
        : ([
            'nativeSegwit',
            'nestedSegwit',
            'legacy',
            'taproot',
          ] as AddressKey[]),
      utxoSortGreatestToLeast:
        opts?.spendStrategy?.utxoSortGreatestToLeast !== undefined
          ? opts.spendStrategy.utxoSortGreatestToLeast
          : true,
      changeAddress: opts?.spendStrategy?.changeAddress
        ? opts?.spendStrategy?.changeAddress
        : 'nativeSegwit',
    },
  }

  return generateWallet({
    mnemonic,
    opts: options,
  })
}

export const getWalletPrivateKeys = ({
  mnemonic,
  opts,
}: {
  mnemonic: string
  opts?: MnemonicToAccountOptions
}): PrivateKeyAccount => {
  const options = {
    network: opts?.network ? opts.network : bitcoin.networks.bitcoin,
    index: opts?.index ? opts.index : 0,
  }

  const hdPaths = {
    ...getHDPaths(options.index, options.network),
    ...opts?.hdPaths,
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)

  const legacyKey = root.derivePath(hdPaths.legacy!).privateKey
  const nestedSegwitKey = root.derivePath(hdPaths.nestedSegwit!).privateKey
  const nativeSegwitKey = root.derivePath(hdPaths.nativeSegwit!).privateKey
  const taprootKey = root.derivePath(hdPaths.taproot!).privateKey

  if (!legacyKey || !nestedSegwitKey || !nativeSegwitKey || !taprootKey) {
    throw new Error('Failed to derive private keys')
  }

  return {
    legacy: {
      privateKey: legacyKey.toString('hex'),
      hdPath: hdPaths.legacy!,
    },
    nestedSegwit: {
      privateKey: nestedSegwitKey.toString('hex'),
      hdPath: hdPaths.nestedSegwit!,
    },
    nativeSegwit: {
      privateKey: nativeSegwitKey.toString('hex'),
      hdPath: hdPaths.nativeSegwit!,
    },
    taproot: {
      privateKey: taprootKey.toString('hex'),
      hdPath: hdPaths.taproot!,
    },
  }
} 