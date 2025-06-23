import { Command } from 'commander'
import * as fs from 'fs-extra'
import { gzip as _gzip } from 'node:zlib'
import { promisify } from 'util'
import * as path from 'path'
import * as alkanes from '@oyl/sdk-alkanes'
import * as utxo from '@oyl/sdk-core'
import { Wallet } from './wallet'
import { contractDeployment } from '@oyl/sdk-alkanes'
import { tokenDeployment } from '@oyl/sdk-alkanes'
import { AlkanesPayload, getAccountSpendableUtxoSet, pushPsbt } from '@oyl/sdk-core'
import { encodeRunestoneProtostone, createAlkanesExecutePsbt, parseAlkaneId, getAccountAlkaneUtxoSet, createAlkanesSendPsbt } from '@oyl/sdk-alkanes'
import { ProtoStone } from '@oyl/sdk-alkanes'
import { encipher } from '@oyl/sdk-alkanes'
import { metashrew } from '@oyl/sdk-core'
import { ProtoruneEdict } from '@oyl/sdk-alkanes'
import { ProtoruneRuneId } from '@oyl/sdk-alkanes'
import { u128 } from '@magiceden-oss/runestone-lib/dist/src/integer'
import { packUTF8 } from '@oyl/sdk-core'
import { splitAlkaneUtxos } from '@oyl/sdk-amm'
//import * as alkanes_rpc from 'alkanes/lib/rpc';
/* @dev example call
  oyl alkane trace -params '{"txid":"e6561c7a8f80560c30a113c418bb56bde65694ac2b309a68549f35fdf2e785cb","vout":0}'

  Note the json format if you need to pass an object.
*/

export class AlkanesCommand extends Command {
  constructor(cmd: string) {
    super(cmd)
  }
  action(fn: any) {
    this.option('-s, --metashrew-rpc-url <url>', 'metashrew JSON-RPC override')
    return super.action(async (options) => {
      metashrew.set(options.metashrewRpcUrl || null)
      return await fn(options)
    })
  }
}
// export const alkanesTrace = new AlkanesCommand('trace')
//   .description('Returns data based on txid and vout of deployed alkane')
//   .option('-p, --provider <provider>', 'provider to use to access the network.')
//   .option(
//     '-params, --parameters <parameters>',
//     'parameters for the ord method you are calling.'
//   )
//   .action(async (options: any) => {
//     const wallet: Wallet = new Wallet(options)
//     const provider = wallet.provider
//     let isJson: { vout: number; txid: string }
//     isJson = JSON.parse(options.parameters)
//     const { vout, txid } = isJson
//     console.log(
//       JSON.stringify(
//         await provider.alkanes.trace({
//           vout,
//           txid,
//         })
//       )
//     )
//   })

// /* @dev example call 
//   oyl alkane new-contract -c ./src/cli/contracts/free_mint.wasm -data 3,77,100

//   The free_mint.wasm contract is used as an example. This deploys to Reserve Number 77.

//   To verify the factory contract was deployed, you can use the oyl alkane trace command 
//   using the returned txid and vout: 3

//   Remember to genBlocks after sending transactions to the regtest chain!
// */
// export const alkaneContractDeploy = new AlkanesCommand('new-contract')
//   .requiredOption(
//     '-data, --calldata <calldata>',
//     'op code + params to be used when deploying a contracts',
//     (value: string, previous: string[]) => {
//       const items = value.split(',')
//       return previous ? previous.concat(items) : items
//     },
//     []
//   )
//   .requiredOption(
//     '-c, --contract <contract>',
//     'Relative path to contract wasm file to deploy (e.g., "../alkanes/free_mint.wasm")'
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .option('-feeRate, --feeRate <feeRate>', 'fee rate')

//   .action(async (options: any) => {
//     const wallet: Wallet = new Wallet(options)
//     const { accountUtxos } = await utxo.accountUtxos({
//       account: wallet.account,
//       provider: wallet.provider,
//     })

//     const contract = new Uint8Array(
//       Array.from(
//         await fs.readFile(path.resolve(process.cwd(), options.contract))
//       )
//     )
//     const gzip = promisify(_gzip)

//     const payload: AlkanesPayload = {
//       body: await gzip(contract, { level: 9 }),
//       cursed: false,
//       tags: { contentType: '' },
//     }

//     const callData: bigint[] = []
//     for (let i = 0; i < options.calldata.length; i++) {
//       callData.push(BigInt(options.calldata[i]))
//     }

//     const protostone = encodeRunestoneProtostone({
//       protostones: [
//         ProtoStone.message({
//           protocolTag: 1n,
//           edicts: [],
//           pointer: 0,
//           refundPointer: 0,
//           calldata: encipher(callData),
//         }),
//       ],
//     }).encodedRunestone

//     console.log(
//       await contractDeployment({
//         protostone,
//         payload,
//         utxos: accountUtxos,
//         feeRate: wallet.feeRate,
//         account: wallet.account,
//         signer: wallet.signer,
//         provider: wallet.provider,
//       })
//     )
//   })

// /* @dev example call 
//   oyl alkane new-token -pre 5000 -amount 1000 -c 100000 -name "OYL" -symbol "OL" -resNumber 77 -i ./src/cli/contracts/image.png
  
//   The resNumber must be a resNumber for a deployed contract. In this case 77 is the resNumber for 
//   the free_mint.wasm contract and the options supplied are for the free_mint.wasm contract.

//   The token will deploy to the next available [2, n] Alkane ID.

//   To get information on the deployed token, you can use the oyl alkane trace command 
//   using the returned txid and vout: 4

//   Remember to genBlocks after transactions...
// */
// export const alkaneTokenDeploy = new AlkanesCommand('new-token')
//   .requiredOption(
//     '-resNumber, --reserveNumber <reserveNumber>',
//     'Number to reserve for factory id'
//   )
//   .requiredOption('-c, --cap <cap>', 'the token cap')
//   .requiredOption('-name, --token-name <name>', 'the token name')
//   .requiredOption('-symbol, --token-symbol <symbol>', 'the token symbol')
//   .requiredOption(
//     '-amount, --amount-per-mint <amount-per-mint>',
//     'Amount of tokens minted each time mint is called'
//   )
//   .option('-pre, --premine <premine>', 'amount to premine')
//   .option(
//     '-i, --image <image>',
//     'Relative path to image file to deploy (e.g., "../alkanes/free_mint.wasm")'
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .option('-feeRate, --feeRate <feeRate>', 'fee rate')
//   .action(async (options: any) => {
//     const wallet: Wallet = new Wallet(options)

//     const { accountUtxos } = await utxo.accountUtxos({
//       account: wallet.account,
//       provider: wallet.provider,
//     })
//     const tokenName = packUTF8(options.tokenName)
//     const tokenSymbol = packUTF8(options.tokenSymbol)

//     if (tokenName.length > 2) {
//       throw new Error('Token name too long')
//     }

//     if (tokenSymbol.length > 1) {
//       throw new Error('Token symbol too long')
//     }

//     const calldata = [
//       BigInt(6),
//       BigInt(options.reserveNumber),
//       BigInt(0),
//       BigInt(options.premine ?? 0),
//       BigInt(options.amountPerMint),
//       BigInt(options.cap),
//       BigInt('0x' + tokenName[0]),
//       BigInt(tokenName.length > 1 ? '0x' + tokenName[1] : 0),
//       BigInt('0x' + tokenSymbol[0]),
//     ]

//     const protostone = encodeRunestoneProtostone({
//       protostones: [
//         ProtoStone.message({
//           protocolTag: 1n,
//           edicts: [],
//           pointer: 0,
//           refundPointer: 0,
//           calldata: encipher(calldata),
//         }),
//       ],
//     }).encodedRunestone

//     if (options.image) {
//       const image = new Uint8Array(
//         Array.from(
//           await fs.readFile(path.resolve(process.cwd(), options.image))
//         )
//       )
//       const gzip = promisify(_gzip)

//       const payload: AlkanesPayload = {
//         body: await gzip(image, { level: 9 }),
//         cursed: false,
//         tags: { contentType: '' },
//       }

//       console.log(
//         await tokenDeployment({
//           payload,
//           protostone,
//           utxos: accountUtxos,
//           feeRate: wallet.feeRate,
//           account: wallet.account,
//           signer: wallet.signer,
//           provider: wallet.provider,
//         })
//       )
//       return
//     }

//     console.log(
//       await alkanes.execute({
//         protostone,
//         utxos: accountUtxos,
//         feeRate: wallet.feeRate,
//         account: wallet.account,
//         signer: wallet.signer,
//         provider: wallet.provider,
//       })
//     )
//   })

/* @dev example call 
  To call opcode 77 (mint) on contract [2,8] (which is a free_mint token contract)
    oyl-mono alkane execute -data 2,8,77 -feeRate 2 -p oylnet

  oyl-mono alkane execute -data 2,1,77 -e 2:1:333:1

  In this example we call a mint (opcode 77) from the [2,1] token. The token
  will mint to the wallet calling execute.

  We also pass the edict 2:1:333:1. That is id [2,1], the amount is 333, and the output is vout 1. 

  Hint: you can grab the TEST_WALLET's alkanes balance with:
  oyl provider alkanes -method getAlkanesByAddress -params '{"address":"bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk"}'
*/
export const alkaneExecute = new AlkanesCommand('execute')
  .requiredOption(
    '-data, --calldata <calldata>',
    'op code + params to be called on a contract',
    (value: string, previous: string[]) => {
      const items = value.split(',')
      return previous ? previous.concat(items) : items
    },
    []
  )
  .option(
    '-e, --edicts <edicts>',
    'edicts for protostone',
    (value: string, previous: string[]) => {
      const items = value.split(',')
      return previous ? previous.concat(items) : items
    },
    []
  )
  .option(
    '-m, --mnemonic <mnemonic>',
    '(optional) Mnemonic used for signing transactions (default = TEST_WALLET)'
  )
  .option(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')
  .action(async (options: any) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const amount = options.amount
    const feeRate = options.feeRate

    let edicts: ProtoruneEdict[] = []

    account.spendStrategy = {
      addressOrder: ['nativeSegwit', 'taproot'],
      utxoSortGreatestToLeast: true,
      changeAddress: 'taproot',
    }

    const { utxos: selectedUtxos } = await getAccountSpendableUtxoSet({
      account,
      amount: 546,
      provider,
    })
   
    const calldata: bigint[] = options.calldata.map((item: string) => BigInt(item))

    if (options.edicts.length > 0) {
      edicts = options.edicts.map((item: string) => {
        const [block, tx, amount, output] = item
          .split(':')
          .map((part) => part.trim())
        return {
          id: new ProtoruneRuneId(u128(Number(block)), u128(Number(tx))),
          amount: amount ? BigInt(amount) : undefined,
          output: output ? Number(output) : undefined,
        }
      })
    }

    const protostone: Buffer = encodeRunestoneProtostone({
      protostones: [
        ProtoStone.message({
          protocolTag: 1n,
          edicts,
          pointer: 0,
          refundPointer: 0,
          calldata: encipher(calldata),
        }),
      ],
    }).encodedRunestone

    const { psbt } = await createAlkanesExecutePsbt({
      protostone,
      utxos: selectedUtxos,
      feeRate,
      account,
      provider,
      })

      const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: psbt,
        finalize: true,
      })
    
      const result = await pushPsbt({
        psbtBase64: signedPsbt,
        provider,
      })
  
      console.log(result)
  })

/**
 *  @dev example call 
 *  oyl-mono alkane send -alkane "2:8" -amt 500000000 -feeRate 2.5 -to bcrt1pkq6ayylfpe5hn05550ry25pkakuf72x9qkjc2sl06dfcet8sg25ql4dm73
 * 
 *  Sends 5 alkane tokens to a given address
*/
export const alkaneSend = new AlkanesCommand('send')
  .requiredOption('-to, --to <to>')
  .requiredOption('-amt, --amount <amount>')
  .requiredOption('-alkane, --alkane <alkane>')
  .option(
    '-m, --mnemonic <mnemonic>',
    '(optional) Mnemonic used for signing transactions (default = TEST_WALLET)'
  )
  .option(
    '-p, --provider <provider>',
    'Network provider type (regtest, bitcoin)'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')
  .action(async (options: any) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const address = options.to
    const alkane = options.alkane
    const amount = options.amount
    const feeRate = options.feeRate ?? 2

    account.spendStrategy = {
      addressOrder: ['taproot'],
      utxoSortGreatestToLeast: true,
      changeAddress: 'taproot',
    }

    const { utxos: selectedUtxos } = await getAccountSpendableUtxoSet({
      account,
      amount: 546,
      provider,
    })
   
    // Find utxos with the given alkane id
    const tokens = [
      {id: parseAlkaneId(alkane), amount: BigInt(amount)},
    ];

    const { utxos: alkanesUtxos } = await getAccountAlkaneUtxoSet({
      tokens,
      account,
      provider,
    })

    const { psbt, fee, vsize } = await createAlkanesSendPsbt({
      utxos: selectedUtxos,
      alkanesUtxos: alkanesUtxos,
      toAddress: address,
      alkaneId: parseAlkaneId(alkane),
      amount,
      feeRate,
      account,
      provider,
      })

      console.log('Estimated fee: ', fee)
      console.log('Estimated vsize: ', vsize)

      const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: psbt,
        finalize: true,
      })

      const result = await pushPsbt({
        psbtBase64: signedPsbt,
        provider,
      })
  
      console.log(result)
  })

// /* @dev example call 
//  oyl alkane create-pool -data "2,1,1" -tokens "2:12:1500,2:29:1500" -feeRate 5 -p oylnet

// Creates a new pool with the given tokens and amounts
// */
// export const alkaneCreatePool = new AlkanesCommand('create-pool')
//   .requiredOption(
//     '-data, --calldata <calldata>',
//     'op code + params to be called on a contract',
//     (value: string, previous: string[]) => {
//       const items = value.split(',')
//       return previous ? previous.concat(items) : items
//     },
//     []
//   )
//   .requiredOption(
//     '-tokens, --tokens <tokens>',
//     'tokens and amounts to pair for pool',
//     (value: string, previous: string[]) => {
//       const items = value.split(',')
//       return previous ? previous.concat(items) : items
//     },
//     []
//   )
//   .option(
//     '-m, --mnemonic <mnemonic>',
//     '(optional) Mnemonic used for signing transactions (default = TEST_WALLET)'
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .option('-feeRate, --feeRate <feeRate>', 'fee rate')
//   .action(async (options: any) => {
//     const wallet: Wallet = new Wallet(options)

//     const { accountUtxos } = await utxo.accountUtxos({
//       account: wallet.account,
//       provider: wallet.provider,
//     })

//     const calldata: bigint[] = options.calldata.map((item) => BigInt(item))

//     const alkaneTokensToPool = options.tokens.map((item) => {
//       const [block, tx, amount] = item.split(':').map((part) => part.trim())
//       return {
//         alkaneId: { block: block, tx: tx },
//         amount: BigInt(amount),
//       }
//     })

//     console.log(
//       await createPool({
//         calldata,
//         token0: alkaneTokensToPool[0].alkaneId,
//         token0Amount: alkaneTokensToPool[0].amount,
//         token1: alkaneTokensToPool[1].alkaneId,
//         token1Amount: alkaneTokensToPool[1].amount,
//         utxos: accountUtxos,
//         feeRate: wallet.feeRate,
//         account: wallet.account,
//         signer: wallet.signer,
//         provider: wallet.provider,
//       })
//     )
//   })

// /* @dev example call 
//  oyl alkane add-liquidity -data "2,1,1" -tokens "2:2:50000,2:3:50000" -feeRate 5 -p alkanes

// Mints new LP tokens and adds liquidity to the pool with the given tokens and amounts
// */
// export const alkaneAddLiquidity = new AlkanesCommand('add-liquidity')
//   .requiredOption(
//     '-data, --calldata <calldata>',
//     'op code + params to be called on a contract',
//     (value: string, previous: string[]) => {
//       const items = value.split(',')
//       return previous ? previous.concat(items) : items
//     },
//     []
//   )
//   .requiredOption(
//     '-tokens, --tokens <tokens>',
//     'tokens and amounts to pair for pool',
//     (value: string, previous: string[]) => {
//       const items = value.split(',')
//       return previous ? previous.concat(items) : items
//     },
//     []
//   )
//   .option(
//     '-m, --mnemonic <mnemonic>',
//     '(optional) Mnemonic used for signing transactions (default = TEST_WALLET)'
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .option('-feeRate, --feeRate <feeRate>', 'fee rate')
//   .action(async (options) => {
//     const wallet: Wallet = new Wallet(options)

//     const { accountUtxos } = await utxo.accountUtxos({
//       account: wallet.account,
//       provider: wallet.provider,
//     })

//     const calldata: bigint[] = options.calldata.map((item) => BigInt(item))

//     const alkaneTokensToMint = options.tokens.map((item) => {
//       const [block, tx, amount] = item.split(':').map((part) => part.trim())
//       return {
//         alkaneId: { block: block, tx: tx },
//         amount: BigInt(amount),
//       }
//     })

//     console.log(
//       await addLiquidity({
//         calldata,
//         token0: alkaneTokensToMint[0].alkaneId,
//         token0Amount: alkaneTokensToMint[0].amount,
//         token1: alkaneTokensToMint[1].alkaneId,
//         token1Amount: alkaneTokensToMint[1].amount,
//         utxos: accountUtxos,
//         feeRate: wallet.feeRate,
//         account: wallet.account,
//         signer: wallet.signer,
//         provider: wallet.provider,
//       })
//     )
//   })

// /* @dev example call
//  AMM factory:
//  oyl alkane simulate  -target "2:1" -inputs "1,2,6,2,7" -tokens "2:6:1000,2:7:2000" -decoder "factory"
//  oyl alkane simulate  -target "2:1" -inputs "2,2,3,2,4" -decoder "factory"

//   Simulates an operation using the pool decoder
//   First input is the opcode
// */
// export const alkaneSimulate = new AlkanesCommand('simulate')
//   .requiredOption(
//     '-target, --target <target>',
//     'target block:tx for simulation',
//     (value) => {
//       const [block, tx] = value.split(':').map((part) => part.trim())
//       return { block: block.toString(), tx: tx.toString() }
//     }
//   )
//   .requiredOption(
//     '-inputs, --inputs <inputs>',
//     'inputs for simulation (comma-separated)',
//     (value) => value.split(',').map((item) => item.trim())
//   )
//   .option(
//     '-tokens, --tokens <tokens>',
//     'tokens and amounts to pair for pool',
//     (value) => {
//       return value.split(',').map((item) => {
//         const [block, tx, value] = item.split(':').map((part) => part.trim())
//         return {
//           id: { block, tx },
//           value,
//         }
//       })
//     },
//     []
//   )
//   .option(
//     '-decoder, --decoder <decoder>',
//     'decoder to use for simulation results (e.g., "pool")'
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .action(async (options: any) => {
//     const wallet: Wallet = new Wallet(options)

//     const request = {
//       alkanes: options.tokens,
//       transaction: '0x',
//       block: '0x',
//       height: '20000',
//       txindex: 0,
//       target: options.target,
//       inputs: options.inputs,
//       pointer: 0,
//       refundPointer: 0,
//       vout: 0,
//     }

//     let decoder: any
//     switch (options.decoder) {
//       case 'pool':
//         const { AlkanesAMMPoolDecoder } = await import('../amm/pool')
//         decoder = (result: any) =>
//           AlkanesAMMPoolDecoder.decodeSimulation(
//             result,
//             Number(options.inputs[0])
//           )
//         break
//       case 'factory':
//         const { AlkanesAMMPoolFactoryDecoder } = await import('../amm/factory')
//         decoder = (result: any) =>
//           AlkanesAMMPoolFactoryDecoder.decodeSimulation(
//             result,
//             Number(options.inputs[0])
//           )
//     }

//     console.log(
//       JSON.stringify(
//         await wallet.provider.alkanes.simulate(request, decoder),
//         null,
//         2
//       )
//     )
//   })

// /* @dev example call
//  oyl alkane get-all-pools-details -target "2:1"

//  Gets details for all pools by:
//  1. Getting all pool IDs from the factory contract
//  2. For each pool ID, getting its details
//  3. Returning a combined result with all pool details
// */
// export const alkaneGetAllPoolsDetails = new AlkanesCommand(
//   'get-all-pools-details'
// )
//   .requiredOption(
//     '-target, --target <target>',
//     'target block:tx for the factory contract',
//     (value) => {
//       const [block, tx] = value.split(':').map((part) => part.trim())
//       return { block: block.toString(), tx: tx.toString() }
//     }
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .action(async (options) => {
//     const wallet: Wallet = new Wallet(options)

//     const { AlkanesAMMPoolFactoryDecoder, PoolFactoryOpcodes } = await import(
//       '../amm/factory'
//     )

//     const request = {
//       alkanes: [],
//       transaction: '0x',
//       block: '0x',
//       height: '20000',
//       txindex: 0,
//       target: options.target,
//       inputs: [PoolFactoryOpcodes.GET_ALL_POOLS.toString()],
//       pointer: 0,
//       refundPointer: 0,
//       vout: 0,
//     }

//     const factoryResult = await wallet.provider.alkanes.simulate(request)

//     const factoryDecoder = new AlkanesAMMPoolFactoryDecoder()
//     const allPoolsDetails = await factoryDecoder.decodeAllPoolsDetails(
//       factoryResult.execution,
//       wallet.provider
//     )

//     console.log(JSON.stringify(allPoolsDetails, null, 2))
//   })

// /* @dev example call
//  oyl alkane preview-remove-liquidity -token "2:1" -amount 1000000

//  Previews the tokens that would be received when removing liquidity from a pool
// */
// export const alkanePreviewRemoveLiquidity = new AlkanesCommand(
//   'preview-remove-liquidity'
// )
//   .requiredOption(
//     '-token, --token <token>',
//     'LP token ID in the format block:tx',
//     (value) => {
//       const [block, tx] = value.split(':').map((part) => part.trim())
//       return { block: block.toString(), tx: tx.toString() }
//     }
//   )
//   .requiredOption(
//     '-amount, --amount <amount>',
//     'Amount of LP tokens to remove',
//     (value) => BigInt(value)
//   )
//   .option(
//     '-p, --provider <provider>',
//     'Network provider type (regtest, bitcoin)'
//   )
//   .action(async (options) => {
//     const wallet: Wallet = new Wallet(options)

//     try {
//       const previewResult =
//         await wallet.provider.alkanes.previewRemoveLiquidity({
//           token: options.token,
//           tokenAmount: options.amount,
//         })

//       console.log(
//         JSON.stringify(
//           {
//             token0: `${previewResult.token0.block}:${previewResult.token0.tx}`,
//             token1: `${previewResult.token1.block}:${previewResult.token1.tx}`,
//             token0Amount: previewResult.token0Amount.toString(),
//             token1Amount: previewResult.token1Amount.toString(),
//           },
//           null,
//           2
//         )
//       )
//     } catch (error) {
//       console.error('Error previewing liquidity removal:', error.message)
//     }
//   })
