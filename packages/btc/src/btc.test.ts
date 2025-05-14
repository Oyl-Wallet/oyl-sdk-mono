import * as bitcoin from 'bitcoinjs-lib'
import { createPsbt } from './btc'
import { Account, mnemonicToAccount, Provider, FormattedUtxo } from '@oyl-sdk/core'

// Mock the core module
jest.mock('@oyl-sdk/core', () => {
  const originalModule = jest.requireActual('@oyl-sdk/core')
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
        ]),
      },
    })),
  }
})

const provider = new Provider({
  url: '',
  projectId: '',
  network: bitcoin.networks.regtest,
  networkType: 'mainnet',
})

const account: Account = mnemonicToAccount({
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  opts: { index: 0, network: bitcoin.networks.regtest },
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
    const result = await createPsbt({
      utxos: testFormattedUtxos,
      toAddress: address!,
      amount: 3000,
      feeRate: 10,
      account: account,
      provider: provider,
    })

    expect(result.psbt).toBeDefined()
  })
})
