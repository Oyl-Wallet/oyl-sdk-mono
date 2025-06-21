import { Command } from 'commander'
import { Provider } from '@oyl/sdk-core'
import { timeout } from '@oyl/sdk-core'
import { Wallet } from './wallet'
import * as utxo from '@oyl/sdk-core'
import * as btc from '@oyl/sdk-btc'
import { REGTEST_FAUCET, DEFAULT_PROVIDER, TEST_WALLET } from './constants'

const RANDOM_ADDRESS = 'bcrt1qz3y37epk6hqlul2pt09hrwgj0s09u5g6kzrkm2'

/* @dev usage
  oyl regtest init
*/
export const init = new Command('init')
  .description(
    'Generate 260 blocks to initialize regtest chain (funds faucet address and an optional user address)'
  )
  .option(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .option(
    '-m, --mnemonic <mnemonic>',
    '(optional) Mnemonic used for signing transactions (default = TEST_WALLET)'
  )
  .option(
    '-a, --address <address>',
    '(optional) Address that will receive initial funds (default = bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx)'
  )
  .action(async (options) => {
    const totalBlockCount = 350
    const faucetBlockCount = 100
    const addressBlockCount = 5

    const provider: Provider = DEFAULT_PROVIDER[options.provider as keyof typeof DEFAULT_PROVIDER]

    const address = options.address || TEST_WALLET.nativeSegwit.address

    const currentBlockCount =
      await provider.sandshrew.bitcoindRpc.getBlockCount!()

    if (currentBlockCount > 250) {
      console.log('Blockchain already initialized')
      console.log('Block count: ', currentBlockCount)
      return
    }

    console.log('Generating blocks...')

    // Generate the first block utxo payments to the faucet.
    await provider.sandshrew.bitcoindRpc.generateToAddress!(
      faucetBlockCount,
      REGTEST_FAUCET.nativeSegwit.address
    )

    await provider.sandshrew.bitcoindRpc.generateToAddress!(
      addressBlockCount,
      address
    )

    // Generate the remaining (at least 100) blocks to a random address to avoid coinbase spend issues
    const transaction = await provider.sandshrew.bitcoindRpc.generateToAddress!(
      totalBlockCount - faucetBlockCount - addressBlockCount,
      RANDOM_ADDRESS
    )
    await timeout(8000)
    const newBlockCount = await provider.sandshrew.bitcoindRpc.getBlockCount!()
    console.log(transaction)
    console.log('Blockchain initialized')
    console.log('Block count: ', newBlockCount)
    console.log('Faucet address: ', REGTEST_FAUCET.nativeSegwit.address)
    console.log(`${address} has been funded with ${addressBlockCount} utxos`)
  })

/* @dev example call
  oyl regtest genBlocks -c 2
*/
export const genBlocks = new Command('genBlocks')
  .description('Generate blocks with transactions from mempool')
  .option(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .option(
    '-a, --address <address>',
    '(optional) Address to recieve block reward'
  )
  .option(
    '-c, --count <count>',
    '(optional)Number of blocks (default = 1)',
    parseInt
  )
  .action(async (options) => {
    const count = options.count || 1
    const address = options.address || RANDOM_ADDRESS
    const provider: Provider = DEFAULT_PROVIDER[options.provider as keyof typeof DEFAULT_PROVIDER]
    const genBlock = await provider.sandshrew.bitcoindRpc.generateToAddress!(
      count,
      address
    )
    console.log('Processed blocks: ', genBlock)
  })

/* @dev example call
  oyl regtest sendFromFaucet --to "bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx" -s 1000000 
*/
export const sendFromFaucet = new Command('sendFromFaucet')
  .description('Send funds from regtest faucet to an address')
  .option(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .requiredOption(
    '-t, --to <to>',
    '(optional) Address to recieve block reward.'
  )
  .option(
    '-s, --sats <sats>',
    '(optional) Number of sats to send (default = 1000000)',
    parseInt
  )
  .action(async (options) => {
    options.mnemonic = REGTEST_FAUCET.mnemonic
    const faucet: Wallet = new Wallet(options)

    const { accountSpendableTotalUtxos } = await utxo.accountUtxos({
      account: faucet.account,
      provider: faucet.provider,
    })
    const utxos = utxo.selectUtxos(
      accountSpendableTotalUtxos,
      faucet.account.spendStrategy
    )

    console.log(
      // await btc.send({
      //   utxos,
      //   toAddress: options.to,
      //   feeRate: faucet.feeRate,
      //   account: faucet.account,
      //   signer: faucet.signer,
      //   provider: faucet.provider,
      //   amount: options.sats || 1000000,
      // })
    )
  })
