import * as bitcoin from 'bitcoinjs-lib'
import { createPsbt } from './btc'
import { Account, mnemonicToAccount } from '@oyl-sdk/core'
import { Provider } from '@oyl-sdk/core'
import { FormattedUtxo } from '@oyl-sdk/core'

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
