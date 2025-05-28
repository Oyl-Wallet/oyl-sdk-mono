import { walletInit } from '@oyl/sdk-core'
import {
  Account,
  GatheredUtxos,
  Provider,
  Signer,
  createInscriptionScript,
  getWalletPrivateKeys,
  mnemonicToAccount,
  tweakSigner,
} from '@oyl/sdk-core'
import * as bitcoin from 'bitcoinjs-lib'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { transferEstimate, commit, reveal, transfer, send } from './brc20'

// Mock the core module
jest.mock('@oyl/sdk-core', () => {
  const originalModule = jest.requireActual('@oyl/sdk-core')
  return {
    ...originalModule,
    getOutputValueByVOutIndex: jest.fn().mockResolvedValue({
      value: 100000,
      script: '0014a60869f0dbcf1dc659c9cecbaf8050135ea9e8cd', // P2WPKH script
    }),
    Provider: jest.fn().mockImplementation(() => ({
      network: bitcoin.networks.regtest,
      sandshrew: {
        multiCall: jest.fn().mockResolvedValue([
          {
            result: {
              txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b276',
              version: 2,
              locktime: 0,
              vin: [],
              vout: [
                {
                  scriptpubkey: '0014a60869f0dbcf1dc659c9cecbaf8050135ea9e8cd', // P2WPKH script
                  scriptpubkey_address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
                  value: 100000,
                },
              ],
              size: 223,
              weight: 562,
              fee: 452,
              status: false,
            },
          },
          {
            result: {
              txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b277',
              version: 2,
              locktime: 0,
              vin: [],
              vout: [
                {
                  scriptpubkey: '0014a60869f0dbcf1dc659c9cecbaf8050135ea9e8cd', // P2WPKH script
                  scriptpubkey_address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
                  value: 546,
                },
              ],
              size: 223,
              weight: 562,
              fee: 452,
              status: false,
            },
          },
        ]),
      },
    })),
  }
})

const account: Account = mnemonicToAccount({
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  opts: { index: 0, network: bitcoin.networks.regtest },
})
const account1: Account = mnemonicToAccount({
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  opts: { index: 1, network: bitcoin.networks.regtest },
})

const provider = new Provider({
  url: '',
  projectId: '',
  network: bitcoin.networks.regtest,
  networkType: 'mainnet',
})
const privateKeys = getWalletPrivateKeys({
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  opts: { index: 0, network: bitcoin.networks.regtest },
})

const keys: walletInit = {
  legacyPrivateKey: privateKeys.legacy.privateKey,
  segwitPrivateKey: privateKeys.nativeSegwit.privateKey,
  nestedSegwitPrivateKey: privateKeys.nestedSegwit.privateKey,
  taprootPrivateKey: privateKeys.taproot.privateKey,
}

const signer: Signer = new Signer(bitcoin.networks.regtest, keys)
const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
  signer.taprootKeyPair,
  { network: provider.getNetwork() }
)

const tweakedTaprootPublicKey = toXOnly(tweakedTaprootKeyPair.publicKey)
const content = `{"p":"brc-20","op":"transfer","tick":"toyl","amt":"100"}`
const script = createInscriptionScript(tweakedTaprootPublicKey, content)
const outputScript = bitcoin.script.compile(script)

const p2pk_redeem = { output: outputScript }

const { output } = bitcoin.payments.p2tr({
  internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
  scriptTree: p2pk_redeem,
  redeem: p2pk_redeem,
  network: provider.getNetwork(),
})

const testFormattedUtxos: GatheredUtxos = {
  utxos: [
    {
      txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
      outputIndex: 0,
      satoshis: 100000,
      confirmations: 3,
      scriptPk: outputScript.toString('hex'),
      address: account.taproot.address,
      inscriptions: [],
      runes: {},
      alkanes: {},
      indexed: false,
    },
    {
      txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
      outputIndex: 0,
      satoshis: 100000,
      confirmations: 3,
      scriptPk: output!.toString('hex'),
      address: account.taproot.address,
      inscriptions: [],
      runes: {},
      alkanes: {},
      indexed: false,
    },
  ],
  totalAmount: 200000,
}

describe('brc20', () => {
  it('transferEstimate', async () => {
    const result = await transferEstimate({
      gatheredUtxos: testFormattedUtxos,
      toAddress: account1.taproot.address,
      feeRate: 3,
      account,
      provider,
    })
    expect(result.psbt).toBeDefined()
    expect(result.fee).toBeDefined()
  })
  it('commit', async () => {
    const result = await commit({
      tweakedTaprootPublicKey,
      gatheredUtxos: testFormattedUtxos,
      amount: 100,
      ticker: 'toyl',
      feeRate: 3,
      account,
      provider,
      finalTransferFee: 654,
    })
    expect(result.psbt).toBeDefined()
    expect(result.script).toBeDefined()
    expect(result.fee).toBeDefined()
  })

  it('reveal', async () => {
    const result = await reveal({
      receiverAddress: account.taproot.address,
      tweakedTaprootKeyPair,
      commitTxId: testFormattedUtxos.utxos[0].txId,
      script: outputScript,
      feeRate: 3,
      provider,
    })
    expect(result.psbt).toBeDefined()
    expect(result.psbtHex).toBeDefined()
    expect(result.fee).toBeDefined()
  })
  it('transfer', async () => {
    const result = await transfer({
      commitChangeUtxoId: testFormattedUtxos.utxos[0].txId,
      revealTxId: testFormattedUtxos.utxos[1].txId,
      toAddress: account1.taproot.address,
      feeRate: 3,
      account,
      provider,
    })
    expect(result.psbt).toBeDefined()
  })
  it('send', async () => {
    const result = await send({
      gatheredUtxos: testFormattedUtxos,
      toAddress: account1.taproot.address,
      amount: 100,
      ticker: 'toyl',
      feeRate: 3,
      account,
      provider,
      signer,
    })
    expect(result.txId).toBeDefined()
  })
}) 