import { Command } from 'commander'
import {
  HDPaths,
  generateMnemonic,
  getHDPaths,
  getWalletPrivateKeys,
  mnemonicToAccount,
} from '@oyl/sdk-core'
import * as bitcoin from 'bitcoinjs-lib'
import { Wallet } from './wallet'

export const privateKeysCommand = new Command('privateKeys')
  .description('Returns private keys for an account object')
  .option(
    '-i, --index <index>',
    'index you want to derive your account keys from'
  )
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network '
  )
  .action((options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const provider = wallet.provider
    const privateKeys = getWalletPrivateKeys({
      mnemonic: options.mnemonic,
      opts: {
        index: options.index,
        network: provider.network,
      },
    })
    console.log(privateKeys)
  })

/* @dev example call 
  oyl account mnemonicToAccount -p oylnet
*/
export const mnemonicToAccountCommand = new Command('mnemonicToAccount')
  .description('Returns an account from a mnemonic')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network '
  )
  .option('-i, --index <index>', 'Account index (default: 0)')
  .option('-w, --wallet-standard <walletStandard>', 'Wallet standard')
  .action((options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const provider = wallet.provider
    let hdPaths: HDPaths | undefined
    if (options.walletStandard) {
      hdPaths = getHDPaths(
        options.index,
        provider.network,
        options.walletStandard
      )
    }
    const account = mnemonicToAccount({
      mnemonic: wallet.mnemonic,
      opts: {
        index: options.index,
        network: provider.network,
        hdPaths,
      },
    })
    console.log(account)
  })

/* @dev example call 
  oyl account generateMnemonic
*/
export const generateMnemonicCommand = new Command('generateMnemonic')
  .description('Returns a new mnemonic phrase')
  .action(() => {
    const mnemonic = generateMnemonic()
    console.log(mnemonic)
  })

export const signPsbt = new Command('sign')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when signing the network psbt'
  )

  .requiredOption('-f, --finalize <finalize>', 'flag to finalize and push psbt')
  .requiredOption('-e, --extract <finalize>', 'flag to extract transaction')

  /* @dev example call 
  oyl account sign -p regtest -f yes -e yes
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const signer = wallet.signer
    let finalize = options.finalize == 'yes' ? true : false
    let extract = options.extract == 'yes' ? true : false
    const { signedHexPsbt, signedPsbt } = await signer.signAllInputs({
      rawPsbtHex: process.env.PSBT_HEX,
      finalize,
    })

    if (extract) {
      const extractedTx =
        bitcoin.Psbt.fromHex(signedHexPsbt).extractTransaction()
      console.log('extracted tx', extractedTx)
      console.log('extracted tx hex', extractedTx.toHex())
    }
    console.log('signed hex psbt', signedHexPsbt)
    console.log('--------------------------------------')
    console.log('signed psbt', signedPsbt)
  })

  /**
   * @dev example call 
   * oyl account generateAddresses -p bitcoin -n 10
   * 
   * You will need to specify a MNOMONIC= in your .env file
   */
export const generateAddressesCommand = new Command('generateAddresses')
  .description('Generates multiple addresses for different indexes')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network (bitcoin, testnet, regtest)'
  )
  .requiredOption(
    '-n, --number <number>',
    'number of address indexes to generate'
  )
  .option('-w, --wallet-standard <walletStandard>', 'Wallet standard')
  .action((options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const provider = wallet.provider
    const numIndexes = parseInt(options.number, 10)
    
    if (isNaN(numIndexes) || numIndexes <= 0) {
      console.error('Please provide a valid positive number for the number of addresses')
      return
    }

    const results = []
    for (let i = 0; i < numIndexes; i++) {
      let hdPaths: HDPaths | undefined
      if (options.walletStandard) {
        hdPaths = getHDPaths(
          i,
          provider.network,
          options.walletStandard
        )
      }
      const account = mnemonicToAccount({
        mnemonic: wallet.mnemonic,
        opts: {
          index: i,
          network: provider.network,
          hdPaths,
        },
      })
      results.push({
        index: i,
        network: options.provider,
        addresses: {
          taproot: account.taproot.address,
          nativeSegwit: account.nativeSegwit.address,
          nestedSegwit: account.nestedSegwit.address,
          legacy: account.legacy.address,
        }
      })
    }
    console.log(JSON.stringify(results, null, 2))
  })
