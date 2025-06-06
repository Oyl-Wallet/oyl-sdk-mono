import * as bitcoin from 'bitcoinjs-lib'
import { assertHex, ECPair } from '../shared/utils'
import { ECPairInterface } from 'ecpair'
import { Signer as bipSigner } from 'bip322-js'
import crypto from 'crypto'
import { tapTweakHash } from '@sadoprotocol/ordit-sdk'
import ecc from '@bitcoinerlab/secp256k1'

export type walletInit = {
  segwitPrivateKey?: string
  taprootPrivateKey?: string
  legacyPrivateKey?: string
  nestedSegwitPrivateKey?: string
}

export enum SighashType {
  ALL = bitcoin.Transaction.SIGHASH_ALL,
  NONE = bitcoin.Transaction.SIGHASH_NONE,
  SINGLE = bitcoin.Transaction.SIGHASH_SINGLE,
  ANYONECANPAY = bitcoin.Transaction.SIGHASH_ANYONECANPAY,
  ALL_ANYONECANPAY = SighashType.ALL | SighashType.ANYONECANPAY,
  NONE_ANYONECANPAY = SighashType.NONE | SighashType.ANYONECANPAY,
  SINGLE_ANYONECANPAY = SighashType.SINGLE | SighashType.ANYONECANPAY,
}

export function tweakSigner(
  signer: bitcoin.Signer,
  opts: any = {}
): bitcoin.Signer {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let privateKey: Uint8Array | undefined = signer.privateKey!
  if (!privateKey) {
    throw new Error('Private key required')
  }
  if (signer.publicKey[0] === 3) {
    privateKey = ecc.privateNegate(privateKey)
  }

  const tweakedPrivateKey = ecc.privateAdd(
    privateKey,
    tapTweakHash(assertHex(signer.publicKey), opts.tweakHash)
  )
  if (!tweakedPrivateKey) {
    throw new Error('Invalid tweaked private key!')
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  })
}

export class Signer {
  network: bitcoin.Network
  segwitKeyPair!: ECPairInterface
  taprootKeyPair!: ECPairInterface
  legacyKeyPair!: ECPairInterface
  nestedSegwitKeyPair!: ECPairInterface
  addresses!: walletInit
  constructor(network: bitcoin.Network, keys: walletInit) {
    if (keys.segwitPrivateKey) {
      this.segwitKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.segwitPrivateKey, 'hex')
      )
    }
    if (keys.taprootPrivateKey) {
      this.taprootKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.taprootPrivateKey, 'hex')
      )
    }
    if (keys.legacyPrivateKey) {
      this.legacyKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.legacyPrivateKey, 'hex')
      )
    }
    if (keys.nestedSegwitPrivateKey) {
      this.nestedSegwitKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.nestedSegwitPrivateKey, 'hex')
      )
    }
    this.network = network
  }

  async signSegwitInput({
    rawPsbt,
    inputNumber,
    finalize,
  }: {
    rawPsbt: string
    inputNumber: number
    finalize: boolean
  }) {
    if (!this.segwitKeyPair) {
      throw new Error('Segwit signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt)

    const matchingPubKey = unSignedPsbt.inputHasPubkey(
      inputNumber,
      this.segwitKeyPair.publicKey
    )
    if (matchingPubKey) {
      unSignedPsbt.signInput(inputNumber, this.segwitKeyPair)
      if (finalize) {
        unSignedPsbt.finalizeInput(inputNumber)
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()

    return { signedPsbt: signedPsbt }
  }

  async signTaprootInput({
    rawPsbt,
    inputNumber,
    finalize,
  }: {
    rawPsbt: string
    inputNumber: number
    finalize: boolean
  }) {
    if (!this.taprootKeyPair) {
      throw new Error('Taproot signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
      network: this.network,
    })
    const tweakedSigner = tweakSigner(this.taprootKeyPair)

    const matchingPubKey = unSignedPsbt.inputHasPubkey(
      inputNumber,
      tweakedSigner.publicKey
    )
    if (!matchingPubKey) {
      throw new Error('Input does not match signer type')
    }
    unSignedPsbt.signTaprootInput(inputNumber, tweakedSigner)

    if (finalize) {
      unSignedPsbt.finalizeInput(inputNumber)
    }

    const signedPsbt = unSignedPsbt.toBase64()

    return { signedPsbt: signedPsbt }
  }

  async signAllTaprootInputs({
    rawPsbt,
    finalize,
  }: {
    rawPsbt: string
    finalize: boolean
  }) {
    if (!this.taprootKeyPair) {
      throw new Error('Taproot signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
      network: this.network,
    })
    let tweakedSigner = tweakSigner(this.taprootKeyPair)

    for (let i = 0; i < unSignedPsbt.inputCount; i++) {
      const matchingPubKey = unSignedPsbt.inputHasPubkey(
        i,
        tweakedSigner.publicKey
      )
      if (matchingPubKey) {
        unSignedPsbt.signTaprootInput(i, tweakedSigner)
        if (finalize) {
          unSignedPsbt.finalizeInput(i)
        }
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()
    const signedHexPsbt = unSignedPsbt.toHex()
    return {
      signedPsbt: signedPsbt,
      raw: unSignedPsbt,
      signedHexPsbt: signedHexPsbt,
    }
  }

  async signAllInputs({
    rawPsbt,
    rawPsbtHex,
    finalize = true,
  }: {
    rawPsbt?: string
    rawPsbtHex?: string
    finalize?: boolean
  }) {
    if (!rawPsbt && !rawPsbtHex) {
      throw new Error('Either rawPsbt or rawPsbtHex must be provided')
    }

    let unSignedPsbt: bitcoin.Psbt
    if (rawPsbt) {
      unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
        network: this.network,
      })
    } else {
      unSignedPsbt = bitcoin.Psbt.fromHex(rawPsbtHex!, {
        network: this.network,
      })
    }

    for (let i = 0; i < unSignedPsbt.inputCount; i++) {
      let tweakedSigner: bitcoin.Signer | undefined
      let matchingLegacy = false
      let matchingNative = false
      let matchingTaprootPubKey = false
      let matchingNestedSegwit = false

      if (this.taprootKeyPair) {
        tweakedSigner = tweakSigner(this.taprootKeyPair, {
          network: this.network,
        })
        matchingTaprootPubKey = unSignedPsbt.inputHasPubkey(
          i,
          tweakedSigner.publicKey
        )
      }
      if (this.legacyKeyPair) {
        matchingLegacy = unSignedPsbt.inputHasPubkey(
          i,
          this.legacyKeyPair.publicKey
        )
      }
      if (this.segwitKeyPair) {
        matchingNative = unSignedPsbt.inputHasPubkey(
          i,
          this.segwitKeyPair.publicKey
        )
      }
      if (this.nestedSegwitKeyPair) {
        try {
          matchingNestedSegwit = unSignedPsbt.inputHasPubkey(
            i,
            this.nestedSegwitKeyPair.publicKey
          )
        } catch (e) {
          console.log(e)
        }
      }

      let allowedSighashTypes = unSignedPsbt.data.inputs[i].sighashType
        ? [unSignedPsbt.data.inputs[i].sighashType].filter((x): x is number => x !== undefined)
        : undefined

      switch (true) {
        case matchingTaprootPubKey:
          if (!tweakedSigner) throw new Error('Tweaked signer not initialized')
          unSignedPsbt.signInput(i, tweakedSigner, allowedSighashTypes)
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        case matchingLegacy:
          unSignedPsbt.signInput(i, this.legacyKeyPair, allowedSighashTypes)
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        case matchingNative:
          unSignedPsbt.signInput(i, this.segwitKeyPair, allowedSighashTypes)
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        case matchingNestedSegwit:
          unSignedPsbt.signInput(
            i,
            this.nestedSegwitKeyPair,
            allowedSighashTypes
          )
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        default:
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()
    const signedHexPsbt = unSignedPsbt.toHex()

    return { signedPsbt, signedHexPsbt }
  }

  async signAllSegwitInputs({
    rawPsbt,
    finalize,
  }: {
    rawPsbt: string
    finalize: boolean
  }) {
    if (!this.segwitKeyPair) {
      throw new Error('Segwit signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
      network: this.network,
    })
    for (let i = 0; i < unSignedPsbt.inputCount; i++) {
      const matchingPubKey = unSignedPsbt.inputHasPubkey(
        i,
        this.segwitKeyPair.publicKey
      )

      if (matchingPubKey) {
        unSignedPsbt.signInput(i, this.segwitKeyPair)
        if (finalize) {
          unSignedPsbt.finalizeInput(i)
        }
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()
    const signedHexPsbt = unSignedPsbt.toHex()

    return { signedPsbt: signedPsbt, signedHexPsbt: signedHexPsbt }
  }

  async signMessage({
    message,
    address,
    keypair,
    protocol,
  }: {
    message: string
    address?: string
    keypair: ECPairInterface
    protocol: 'ecdsa' | 'bip322'
  }) {
    if (!keypair) {
      throw new Error('Keypair required to sign')
    }

    if (protocol === 'bip322') {
      if (!address) throw new Error('Address is required for BIP-322 signing')
      return bipSigner
        .sign(keypair.toWIF(), address, message)
        .toString('base64')
    }
    if (protocol === 'ecdsa') {
      const hashedMessage = crypto
        .createHash('sha256')
        .update(message)
        .digest()
        .toString('base64')
      const signature = keypair.sign(Buffer.from(hashedMessage, 'base64'))
      return signature.toString('base64')
    }
  }
}
