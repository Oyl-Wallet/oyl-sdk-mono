import { MnemonicToAccountOptions } from '..'
import * as bitcoin from 'bitcoinjs-lib'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

export const UTXO_DUST = 546
export const UTXO_ASSET_SAT_THRESHOLD = 1000

export const maximumScriptBytes = 520

export const MAXIMUM_FEE = 5000000


export const regtestOpts: MnemonicToAccountOptions = {
  network: bitcoin.networks.regtest,
  index: 0,
  spendStrategy: {
    changeAddress: 'nativeSegwit',
    addressOrder: ['nativeSegwit', 'nestedSegwit', 'taproot', 'legacy'],
    utxoSortGreatestToLeast: true,
  },
}

export const Opts: MnemonicToAccountOptions = {
  network: bitcoin.networks.bitcoin,
  index: 0,
  spendStrategy: {
    changeAddress: 'nativeSegwit',
    addressOrder: ['nativeSegwit', 'nestedSegwit', 'taproot', 'legacy'],
    utxoSortGreatestToLeast: true,
  },
}

export const regtestMnemonic: string = process.env.REGTEST1 ?? (() => { throw new Error('REGTEST1 environment variable is required') })()
export const mainnetMnemonic: string = process.env.MAINNET_MNEMONIC ?? (() => { throw new Error('MAINNET_MNEMONIC environment variable is required') })()

export const getBrc20Data = ({
  amount,
  tick,
}: {
  amount: number | string
  tick: string
}) => ({
  mediaContent: `{"p":"brc-20","op":"transfer","tick":"${tick}","amt":"${amount}"}`,
  mediaType: 'text/plain',
})
