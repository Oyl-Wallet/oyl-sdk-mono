import * as bitcoin from 'bitcoinjs-lib'
import { createBtcSendPsbt } from './btc'
import { Account, mnemonicToAccount, Provider, FormattedUtxo, getWalletPrivateKeys, Signer } from '@oyl/sdk-core'

// Mock the core module
// jest.mock('@oyl/sdk-core', () => {
//   const originalModule = jest.requireActual('@oyl/sdk-core')
//   return {
//     ...originalModule,
//     getOutputValueByVOutIndex: jest.fn().mockResolvedValue({
//       value: 100000,
//       script: '0014a60869f0dbcf1dc659c9cecbaf8050135ea9e8cd', // P2WPKH script
//     }),
//     Provider: jest.fn().mockImplementation(() => ({
//       network: bitcoin.networks.regtest,
//       sandshrew: {
//         multiCall: jest.fn().mockResolvedValue([
//           {
//             result: {
//               txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b276',
//               version: 2,
//               locktime: 0,
//               vin: [],
//               vout: [
//                 {
//                   scriptpubkey: '0014a60869f0dbcf1dc659c9cecbaf8050135ea9e8cd', // P2WPKH script
//                   scriptpubkey_address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
//                   value: 100000,
//                 },
//               ],
//               size: 223,
//               weight: 562,
//               fee: 452,
//               status: false,
//             },
//           },
//         ]),
//       },
//     })),
//   }
// })

const provider = new Provider({
  url: '',
  projectId: '',
  network: bitcoin.networks.regtest,
  networkType: 'mainnet',
})

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const account: Account = mnemonicToAccount({
  mnemonic,
  opts: { index: 0, network: bitcoin.networks.regtest },
})

const privateKeys = getWalletPrivateKeys({
  mnemonic,
  opts: {
    network: account.network,
  },
})

const signer = new Signer(account.network, {
  taprootPrivateKey: privateKeys.taproot.privateKey,
  segwitPrivateKey: privateKeys.nativeSegwit.privateKey,
  nestedSegwitPrivateKey: privateKeys.nestedSegwit.privateKey,
  legacyPrivateKey: privateKeys.legacy.privateKey,
})

const { address } = bitcoin.payments.p2wpkh({
  pubkey: Buffer.from(account.nativeSegwit.pubkey, 'hex'),
  network: bitcoin.networks.regtest,
})
const { output } = bitcoin.payments.p2wpkh({
  address,
  network: bitcoin.networks.regtest,
})
const scriptPk = output!.toString('hex')

const testFormattedUtxos: FormattedUtxo[] = [
  {
    txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
    outputIndex: 0,
    satoshis: 100000,
    confirmations: 3,
    scriptPk,
    address: account.nativeSegwit.address,
    inscriptions: [],
    runes: {},
    alkanes: {},
    indexed: true,
  },
  {
    txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
    outputIndex: 0,
    satoshis: 100000,
    confirmations: 3,
    scriptPk,
    address: account.nativeSegwit.address,
    inscriptions: [],
    runes: {},
    alkanes: {},
    indexed: true,
  },
]

describe('btc sendTx', () => {
  it('construct psbt', async () => {
    const feeRate = 5
    const { psbt, fee: expectedFee, vsize: expectedVsize } = await createBtcSendPsbt({
      utxos: testFormattedUtxos,
      toAddress: address!,
      amount: 100000,
      feeRate,
      account: account,
      provider: provider,
    })

    console.log('testxx: ', psbt)

    const { signedPsbt } = await signer.signAllInputs({
      rawPsbt: psbt,
      finalize: true,
    })

    console.log('signedPsbt: ', signedPsbt)

    // get actual fee from signedPsbt
    const rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
      network: account.network,
    }).extractTransaction()

    console.log('rawPsbt: ', rawPsbt.toHex())

    const actualVsize = rawPsbt.virtualSize()
    console.log('vsize: ', actualVsize)

    const actualFee = actualVsize * feeRate

    console.log('feeRate: ', feeRate)
    console.log('expectedFee: ', expectedFee)
    console.log('expectedVsize: ', expectedVsize)
    console.log('actualFee: ', actualFee)
    console.log('actualVsize: ', actualVsize)

    expect(actualFee).toBe(expectedFee)
    expect(actualVsize).toBe(expectedVsize)

    expect(signedPsbt).toBeDefined()
  })
})
