import { encodeVarint, minimumFee } from '@oyl/sdk-core'
import * as bitcoin from 'bitcoinjs-lib'
import {
  findXAmountOfSats,
  addTaprootInternalPubkey,
  getOutputValueByVOutIndex,
  hexToLittleEndian,
  inscriptionSats,
  tweakSigner,
  pushPsbt,
} from '@oyl/sdk-core'
import {
  Account,
  Provider,
  OylTransactionError,
  GatheredUtxos,
  RuneUTXO,
  getAddressType,
  Signer,
} from '@oyl/sdk-core'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341'
import { encodeRunestone, RunestoneSpec } from '@magiceden-oss/runestone-lib'
import { OrdOutput } from '@oyl/sdk-core'
import { OrdOutputRune } from '@oyl/sdk-core'
//import { rune } from 'index'

interface OrdOutputs {
  result: OrdOutput
}
interface SingleRuneOutpoint {
  output: string
  wallet_addr: string
  pkscript: string
  balances: number[]
  decimals: number[]
  rune_ids: string[]
  satoshis?: number
}

export type RuneUtxo = {
  outpointId: string
  amount: number
  scriptPk: string
  satoshis: number
}

export const createSendPsbt = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  amount,
  feeRate,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  inscriptionAddress: string
  toAddress: string
  amount: number
  feeRate?: number
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 3,
    })
    const calculatedFee = minFee * feeRate! < 250 ? 250 : minFee * feeRate!
    let finalFee = fee ? fee : calculatedFee

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee) + Number(inscriptionSats)
    )

    if (gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 3,
      })

      finalFee = Math.max(txSize * feeRate!, 250)
      gatheredUtxos = findXAmountOfSats(
        originalGatheredUtxos.utxos,
        Number(finalFee) + Number(amount)
      )
    }

    let psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
    const { runeUtxos, runeTotalSatoshis, divisibility } = await findRuneUtxos({
      address: inscriptionAddress,
      greatestToLeast: account.spendStrategy.utxoSortGreatestToLeast,
      provider,
      runeId,
      targetNumberOfRunes: amount,
    })

    for await (const utxo of runeUtxos) {
      if (getAddressType(utxo.address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(utxo.txId)
        psbt.addInput({
          hash: utxo.txId,
          index: parseInt(utxo.outputIndex),
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(utxo.address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

        psbt.addInput({
          hash: utxo.txId,
          index: parseInt(utxo.outputIndex),
          redeemScript: redeemScript,
          witnessUtxo: {
            value: utxo.satoshis,
            script: bitcoin.script.compile([
              bitcoin.opcodes.OP_HASH160,
              bitcoin.crypto.hash160(redeemScript),
              bitcoin.opcodes.OP_EQUAL,
            ]),
          },
        })
      }
      if (
        getAddressType(utxo.address) === 1 ||
        getAddressType(utxo.address) === 3
      ) {
        psbt.addInput({
          hash: utxo.txId,
          index: parseInt(utxo.outputIndex),
          witnessUtxo: {
            value: utxo.satoshis,
            script: Buffer.from(utxo.scriptPk, 'hex'),
          },
        })
      }
    }

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(
          gatheredUtxos.utxos[i].txId
        )
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          redeemScript: redeemScript,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: bitcoin.script.compile([
              bitcoin.opcodes.OP_HASH160,
              bitcoin.crypto.hash160(redeemScript),
              bitcoin.opcodes.OP_EQUAL,
            ]),
          },
        })
      }
      if (
        getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
        getAddressType(gatheredUtxos.utxos[i].address) === 3
      ) {
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
          },
        })
      }
    }

    const script = createRuneSendScript({
      runeId,
      amount,
      divisibility,
      sendOutputIndex: 2,
      pointer: 1,
    })
    const output = { script: script, value: 0 }
    psbt.addOutput(output)

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee + inscriptionSats)

    psbt.addOutput({
      value: inscriptionSats,
      address: account.taproot.address,
    })

    psbt.addOutput({
      value: runeTotalSatoshis,
      address: toAddress,
    })

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const createMintPsbt = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  feeRate,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const minTxSize = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    let calculatedFee = Math.max(minTxSize * feeRate!, 250)
    let finalFee = fee ?? calculatedFee

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee) + Number(inscriptionSats)
    )

    let psbt = new bitcoin.Psbt({ network: provider.network })

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate! < 250 ? 250 : txSize * feeRate!

      if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
        throw new OylTransactionError(Error('Insufficient Balance'))
      }
    }

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }
    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(
          gatheredUtxos.utxos[i].txId
        )
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          redeemScript: redeemScript,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: bitcoin.script.compile([
              bitcoin.opcodes.OP_HASH160,
              bitcoin.crypto.hash160(redeemScript),
              bitcoin.opcodes.OP_EQUAL,
            ]),
          },
        })
      }
      if (
        getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
        getAddressType(gatheredUtxos.utxos[i].address) === 3
      ) {
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
          },
        })
      }
    }

    const script = createRuneMintScript({
      runeId,
      pointer: 1,
    })

    const output = { script, value: 0 }
    psbt.addOutput(output)

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee + inscriptionSats)

    psbt.addOutput({
      value: inscriptionSats,
      address: account.taproot.address,
    })

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const createEtchCommit = async ({
  gatheredUtxos,
  taprootKeyPair,
  tweakedTaprootKeyPair,
  runeName,
  account,
  provider,
  feeRate,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  taprootKeyPair: bitcoin.Signer
  tweakedTaprootKeyPair: bitcoin.Signer
  runeName: string
  account: Account
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    const calculatedFee = minFee * feeRate! < 250 ? 250 : minFee * feeRate!
    let finalFee = fee ? fee : calculatedFee

    let psbt = new bitcoin.Psbt({ network: provider.network })

    let runeNameHex = runeFromStr(runeName).toString(16)
    if (runeNameHex.length % 2 !== 0) {
      runeNameHex = '0' + runeNameHex
    }

    const runeNameLittleEndian = hexToLittleEndian(runeNameHex)
    const runeNameLittleEndianUint8 = Uint8Array.from(
      Buffer.from(runeNameLittleEndian, 'hex')
    )

    let script: bitcoin.Stack = [
      toXOnly(tweakedTaprootKeyPair.publicKey),
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_0,
      bitcoin.opcodes.OP_IF,
      Buffer.from(runeNameLittleEndianUint8),
      bitcoin.opcodes.OP_ENDIF,
    ]

    const outputScript = bitcoin.script.compile(script)

    const inscriberInfo = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
      scriptTree: { output: outputScript },
      network: provider.network,
    })

    if (!inscriberInfo.address) {
      throw new OylTransactionError(Error('Failed to generate inscriber address'))
    }
    psbt.addOutput({
      value: Number(finalFee) + 546,
      address: inscriberInfo.address,
    })

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee) + Number(inscriptionSats)
    )

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate! < 250 ? 250 : txSize * feeRate!

      if (gatheredUtxos.totalAmount < finalFee) {
        gatheredUtxos = findXAmountOfSats(
          originalGatheredUtxos.utxos,
          Number(finalFee) + Number(inscriptionSats)
        )
      }
    }

    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(
          gatheredUtxos.utxos[i].txId
        )
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          redeemScript: redeemScript,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: bitcoin.script.compile([
              bitcoin.opcodes.OP_HASH160,
              bitcoin.crypto.hash160(redeemScript),
              bitcoin.opcodes.OP_EQUAL,
            ]),
          },
        })
      }
      if (
        getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
        getAddressType(gatheredUtxos.utxos[i].address) === 3
      ) {
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
          },
        })
      }
    }

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee * 2 + inscriptionSats)

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64(), script: outputScript }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const createEtchReveal = async ({
  symbol,
  cap,
  premine,
  perMintAmount,
  turbo,
  divisibility,
  runeName,
  receiverAddress,
  script,
  feeRate,
  tweakedTaprootKeyPair,
  provider,
  fee = 0,
  commitTxId,
}: {
  symbol: string
  cap: bigint
  premine: bigint
  perMintAmount: bigint
  turbo: boolean
  divisibility: number
  runeName: string
  receiverAddress: string
  script: Buffer
  feeRate: number
  tweakedTaprootKeyPair: bitcoin.Signer
  provider: Provider
  fee?: number
  commitTxId: string
}) => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.network })
    const minFee = minimumFee({
      taprootInputCount: 1,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    const revealTxBaseFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    const revealTxChange = fee === 0 ? 0 : Number(revealTxBaseFee) - fee

    const commitTxOutput = await getOutputValueByVOutIndex({
      txId: commitTxId,
      vOut: 0,
      esploraRpc: provider.esplora,
    })

    if (!commitTxOutput) {
      throw new Error('Error getting vin #0 value')
    }

    const p2pk_redeem = { output: script }

    const { output, witness } = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
      scriptTree: p2pk_redeem,
      redeem: p2pk_redeem,
      network: provider.network,
    })

    if (!output) {
      throw new OylTransactionError(Error('Failed to generate p2tr output'))
    }

    psbt.addInput({
      hash: commitTxId,
      index: 0,
      witnessUtxo: {
        value: commitTxOutput.value,
        script: output,
      },
      tapLeafScript: [
        {
          leafVersion: LEAF_VERSION_TAPSCRIPT,
          script: p2pk_redeem.output,
          controlBlock: witness![witness!.length - 1],
        },
      ],
    })

    const runestone = encodeRunestone({
      etching: {
        runeName,
        divisibility,
        symbol,
        premine,
        terms: {
          cap: cap ? BigInt(cap) : undefined,
          amount: perMintAmount ? BigInt(perMintAmount) : undefined,
        },
        turbo,
      },
      pointer: 1,
    }).encodedRunestone

    psbt.addOutput({
      value: 0,
      script: runestone,
    })

    psbt.addOutput({
      value: 546,
      address: receiverAddress,
    })
    if (revealTxChange > 546) {
      psbt.addOutput({
        value: revealTxChange,
        address: receiverAddress,
      })
    }

    psbt.signInput(0, tweakedTaprootKeyPair)
    psbt.finalizeInput(0)

    return {
      psbt: psbt.toBase64(),
      psbtHex: psbt.extractTransaction().toHex(),
      fee: revealTxChange,
    }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const getRuneOutpoints = async ({
  address,
  provider,
  runeId,
}: {
  address: string
  provider: Provider
  runeId: string
}): Promise<SingleRuneOutpoint[]> => {
  const addressOutpoints = await provider.ord.getOrdData(address) as { outputs: string[] }
  const spacedRuneName = await provider.ord.getRuneById(runeId) as { entry: { spaced_rune: string } }
  const runeName = spacedRuneName.entry.spaced_rune

  const ordOutputs = await batchOrdOutput({
    outpoints: addressOutpoints.outputs,
    provider: provider,
    rune_name: runeName,
  })

  const runeUtxosOutpoints = await mapRuneBalances({
    ordOutputs: ordOutputs,
    provider: provider,
  })

  return runeUtxosOutpoints
}

const mapRuneBalances = async ({
  ordOutputs,
  provider,
}: {
  ordOutputs: OrdOutputs[]
  provider: Provider
}): Promise<SingleRuneOutpoint[]> => {
  const runeOutpoints: SingleRuneOutpoint[] = []
  for (let i = 0; i < ordOutputs.length; i++) {
    const singleRuneOutpoint: any = {}
    singleRuneOutpoint['output'] = ordOutputs[i].result.output
    singleRuneOutpoint['wallet_addr'] = ordOutputs[i].result.address
    const [txId, txIndex] = ordOutputs[i].result.output!.split(':')
    singleRuneOutpoint['pkscript'] = (
      await provider.esplora.getTxInfo(txId)
    ).vout[Number(txIndex)].scriptpubkey
    singleRuneOutpoint['balances'] = []
    singleRuneOutpoint['decimals'] = []
    singleRuneOutpoint['rune_ids'] = []
    const runes = ordOutputs[i].result.runes as Record<string, OrdOutputRune>
    for (const rune in runes) {
      singleRuneOutpoint['balances'].push(
        runes[rune].amount
      )
      singleRuneOutpoint['decimals'].push(
        runes[rune].divisibility
      )
      const runeInfo = await provider.ord.getRuneByName(rune) as { id: string }
      singleRuneOutpoint['rune_ids'].push(
        runeInfo.id
      )
    }
    runeOutpoints.push(singleRuneOutpoint)
  }
  return runeOutpoints
}

const batchOrdOutput = async ({
  outpoints,
  provider,
  rune_name,
}: {
  outpoints: string[]
  provider: Provider
  rune_name: string
}): Promise<OrdOutputs[]> => {
  const MAX_OUTPOINTS_PER_CALL = 1000
  const ordOutputs: OrdOutputs[] = []
  for (let i = 0; i < outpoints.length; i += MAX_OUTPOINTS_PER_CALL) {
    const batch = outpoints.slice(i, i + MAX_OUTPOINTS_PER_CALL)
    const multiCall = batch.map((outpoint) => {
      return ['ord_output', [outpoint]]
    })
    const results = await provider.sandshrew.multiCall(multiCall)
    for (let i = 0; i < results.length; i++) {
      results[i].result['output'] = batch[i]
    }
    const filteredResult = results.filter((output: OrdOutputs) =>
      Object.keys(output.result.runes).includes(rune_name)
    )

    ordOutputs.push(...filteredResult)
  }
  return ordOutputs
}

export const findRuneUtxos = async ({
  address,
  greatestToLeast,
  provider,
  runeId,
  targetNumberOfRunes,
}: {
  address: string
  greatestToLeast: boolean
  provider: Provider
  runeId: string
  targetNumberOfRunes: number
}) => {
  const runeUtxos: RuneUTXO[] = []

  const runeUtxoOutpoints: SingleRuneOutpoint[] = await getRuneOutpoints({
    address: address,
    provider: provider,
    runeId: runeId,
  })

  if (greatestToLeast) {
    runeUtxoOutpoints?.sort((a, b) => (b.satoshis ?? 0) - (a.satoshis ?? 0))
  } else {
    runeUtxoOutpoints?.sort((a, b) => (a.satoshis ?? 0) - (b.satoshis ?? 0))
  }
  let runeTotalSatoshis: number = 0
  let runeTotalAmount: number = 0
  let divisibility: number = 0

  for (const rune of runeUtxoOutpoints) {
    if (runeTotalAmount < targetNumberOfRunes) {
      const index = rune.rune_ids.indexOf(runeId)
      if (index !== -1) {
        const txSplit = rune.output.split(':')
        const txHash = txSplit[0]
        const txIndex = txSplit[1]
        const txDetails = await provider.esplora.getTxInfo(txHash)

        if (!txDetails?.vout || txDetails.vout.length < 1) {
          throw new Error('Unable to find rune utxo')
        }

        const outputId = `${txHash}:${txIndex}`
        const [inscriptionsOnOutput] = await Promise.all([
          provider.ord.getTxOutput(outputId),
        ])

        if (inscriptionsOnOutput.inscriptions.length > 0) {
          throw new Error(
            'Unable to send from UTXO with multiple inscriptions. Split UTXO before sending.'
          )
        }
        const satoshis = txDetails.vout[Number(txIndex)].value
        const holderAddress = rune.wallet_addr

        runeUtxos.push({
          txId: txHash,
          outputIndex: txIndex,
          scriptPk: rune.pkscript,
          address: holderAddress,
          amountOfRunes: rune.balances[index],
          satoshis,
        })
        runeTotalSatoshis += satoshis
        runeTotalAmount += rune.balances[index] / 10 ** rune.decimals[index]

        if (divisibility === undefined) {
          divisibility = rune.decimals[index]
        }
      }
    } else {
      break
    }
  }

  return { runeUtxos, runeTotalSatoshis, divisibility }
}

export const actualSendFee = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  amount,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  inscriptionAddress?: string
  toAddress: string
  amount: number
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createSendPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    inscriptionAddress,
    toAddress,
    amount,
    feeRate,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()

  if (!provider.sandshrew.bitcoindRpc.testMemPoolAccept) {
    throw new Error('bitcoindRpc is undefined');
  }
  
  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate!

  const { psbt: finalPsbt } = await createSendPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    inscriptionAddress,
    toAddress,
    amount,
    feeRate,
    fee: correctFee,
  })

  const { signedPsbt: signedAll } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
    network: account.network,
  })

  const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate!

  return { fee: finalFee }
}

export const actualMintFee = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createMintPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    feeRate,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()

  if (!provider.sandshrew.bitcoindRpc.testMemPoolAccept) {
    throw new Error('bitcoindRpc is undefined');
  }

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate!

  const { psbt: finalPsbt } = await createMintPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    feeRate,
    fee: correctFee,
  })

  const { signedPsbt: signedAll } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
    network: account.network,
  })

  const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate!

  return { fee: finalFee }
}

export const actualEtchCommitFee = async ({
  tweakedTaprootKeyPair,
  taprootKeyPair,
  gatheredUtxos,
  account,
  runeName,
  provider,
  feeRate,
  signer,
}: {
  tweakedTaprootKeyPair: bitcoin.Signer
  taprootKeyPair: bitcoin.Signer
  gatheredUtxos: GatheredUtxos
  account: Account
  runeName: string
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createEtchCommit({
    gatheredUtxos,
    taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
    account,
    provider,
    feeRate,
  })
  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()

  if (!provider.sandshrew.bitcoindRpc.testMemPoolAccept) {
    throw new Error('bitcoindRpc is undefined');
  }

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate!

  const { psbt: finalPsbt } = await createEtchCommit({
    gatheredUtxos,
    taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
    account,
    provider,
    feeRate: feeRate!,
    fee: correctFee,
  })

  const { signedPsbt: signedAll } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
    network: account.network,
  })

  const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate!

  return { fee: finalFee }
}

export const actualEtchRevealFee = async ({
  tweakedTaprootKeyPair,
  taprootKeyPair,
  symbol,
  cap,
  premine,
  perMintAmount,
  turbo,
  divisibility,
  runeName,
  commitTxId,
  receiverAddress,
  script,
  account,
  provider,
  feeRate,
  signer,
}: {
  tweakedTaprootKeyPair: bitcoin.Signer
  taprootKeyPair: bitcoin.Signer
  symbol: string
  cap: bigint
  premine: bigint
  perMintAmount: bigint
  turbo: boolean
  divisibility: number
  runeName: string
  commitTxId: string
  receiverAddress: string
  script: Buffer
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createEtchReveal({
    commitTxId,
    receiverAddress,
    script,
    tweakedTaprootKeyPair,
    symbol,
    cap,
    premine,
    perMintAmount,
    turbo,
    divisibility,
    runeName,
    provider,
    feeRate: feeRate!,
  })
  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()

  if (!provider.sandshrew.bitcoindRpc.testMemPoolAccept) {
    throw new Error('bitcoindRpc is undefined');
  }

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate!

  const { psbt: finalPsbt } = await createEtchReveal({
    commitTxId,
    receiverAddress,
    script,
    tweakedTaprootKeyPair,
    symbol,
    cap,
    premine,
    perMintAmount,
    turbo,
    divisibility,
    runeName,
    provider,
    feeRate: feeRate!,
    fee: correctFee,
  })

  const { signedPsbt: signedAll } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
    network: account.network,
  })

  const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate!

  return { fee: finalFee }
}

export const send = async ({
  gatheredUtxos,
  toAddress,
  amount,
  runeId,
  inscriptionAddress,
  feeRate,
  account,
  provider,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  toAddress: string
  amount: number
  runeId: string
  inscriptionAddress?: string
  feeRate?: number
  account: Account
  provider: Provider
  signer: Signer
}) => {
  if (!inscriptionAddress) {
    inscriptionAddress = account.taproot.address
  }
  const { fee } = await actualSendFee({
    gatheredUtxos,
    account,
    runeId,
    amount,
    provider,
    toAddress,
    inscriptionAddress,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createSendPsbt({
    gatheredUtxos,
    account,
    runeId,
    amount,
    provider,
    toAddress,
    inscriptionAddress,
    feeRate,
    fee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await pushPsbt({
    psbtBase64: signedPsbt,
    provider,
  })

  return result
}

export const mint = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const { fee } = await actualMintFee({
    gatheredUtxos,
    account,
    runeId,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createMintPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    feeRate,
    fee: fee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await pushPsbt({
    psbtBase64: signedPsbt,
    provider,
  })

  return result
}

export const etchCommit = async ({
  gatheredUtxos,
  runeName,
  account,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  runeName: string
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.network,
    }
  )
  const { fee: commitFee } = await actualEtchCommitFee({
    gatheredUtxos,
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
    account,
    provider,
    feeRate: feeRate!,
    signer,
  })

  const { psbt: finalPsbt, script } = await createEtchCommit({
    gatheredUtxos,
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
    account,
    provider,
    feeRate: feeRate!,
    fee: commitFee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await pushPsbt({
    psbtBase64: signedPsbt,
    provider,
  })

  return { ...result, script: script.toString('hex') }
}

export const etchReveal = async ({
  symbol,
  cap,
  premine,
  perMintAmount,
  turbo,
  divisibility,
  commitTxId,
  script,
  runeName,
  account,
  provider,
  feeRate,
  signer,
}: {
  symbol: string
  cap?: bigint
  premine?: bigint
  perMintAmount: bigint
  turbo?: boolean
  divisibility?: number
  commitTxId: string
  script: string
  runeName: string
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.network,
    }
  )

  const { fee } = await actualEtchRevealFee({
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    symbol,
    cap: cap!,
    premine: premine!,
    perMintAmount,
    turbo: turbo!,
    divisibility: divisibility!,
    runeName,
    account,
    provider,
    feeRate: feeRate!,
    signer,
  })

  const { psbt: finalRevealPsbt } = await createEtchReveal({
    tweakedTaprootKeyPair,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    symbol,
    cap: cap!,
    premine: premine!,
    perMintAmount,
    turbo: turbo!,
    divisibility: divisibility!,
    runeName,
    provider,
    feeRate: feeRate!,
    fee,
  })

  const { signedPsbt: revealSignedPsbt } = await signer.signAllInputs({
    rawPsbt: finalRevealPsbt,
    finalize: true,
  })

  const revealResult = await pushPsbt({
    psbtBase64: revealSignedPsbt,
    provider,
  })

  return revealResult
}

export function findRuneUtxosToSpend(utxos: RuneUtxo[], target: number) {
  if (!utxos || utxos.length === 0) {
    return undefined
  }
  let totalAmount = 0
  let totalSatoshis = 0
  const selectedUtxos: RuneUtxo[] = []

  for (const utxo of utxos) {
    if (totalAmount >= target) break

    selectedUtxos.push(utxo)
    totalSatoshis += utxo.satoshis
    totalAmount += utxo.amount
  }

  if (totalAmount >= target) {
    return {
      selectedUtxos,
      change: totalAmount - target,
      totalSatoshis: totalSatoshis,
    }
  } else {
    return undefined
  }
}

export function runeFromStr(s: string) {
  let x = 0n // Use BigInt for handling large numbers equivalent to u128 in Rust.
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (i > 0) {
      x += 1n
    }
    x *= 26n // Multiply by 26 at each step to shift left in base 26.

    // Convert character to a number (0-25) and add it to x.
    const charCode = c.charCodeAt(0)
    if (charCode >= 65 && charCode <= 90) {
      // 'A'.charCodeAt(0) is 65, 'Z'.charCodeAt(0) is 90
      x += BigInt(charCode - 65)
    } else {
      throw new Error(`Invalid character in rune name: ${c}`)
    }
  }
  return x
}

export const createRuneSendScript = ({
  runeId,
  amount,
  divisibility = 0,
  sendOutputIndex = 1,
  pointer = 0,
}: {
  runeId: string
  amount: number
  divisibility?: number
  sendOutputIndex?: number
  pointer: number
}) => {
  if (divisibility === 0) {
    amount = Math.floor(amount)
  }
  const pointerFlag = encodeVarint(BigInt(22)).varint
  const pointerVarint = encodeVarint(BigInt(pointer)).varint
  const bodyFlag = encodeVarint(BigInt(0)).varint
  const amountToSend = encodeVarint(BigInt(amount * 10 ** divisibility)).varint
  const encodedOutputIndex = encodeVarint(BigInt(sendOutputIndex)).varint
  const splitIdString = runeId.split(':')
  const block = Number(splitIdString[0])
  const blockTx = Number(splitIdString[1])

  const encodedBlock = encodeVarint(BigInt(block)).varint
  const encodedBlockTxNumber = encodeVarint(BigInt(blockTx)).varint

  const runeStone = Buffer.concat([
    pointerFlag,
    pointerVarint,
    bodyFlag,
    encodedBlock,
    encodedBlockTxNumber,
    amountToSend,
    encodedOutputIndex,
  ])

  let runeStoneLength: string = runeStone.byteLength.toString(16)

  if (runeStoneLength.length % 2 !== 0) {
    runeStoneLength = '0' + runeStone.byteLength.toString(16)
  }

  const script: Buffer = Buffer.concat([
    Buffer.from('6a', 'hex'),
    Buffer.from('5d', 'hex'),
    Buffer.from(runeStoneLength, 'hex'),
    runeStone,
  ])
  return script
}

export const createRuneMintScript = ({
  runeId,
  pointer = 1,
}: {
  runeId: string
  pointer?: number
}) => {
  const [blockStr, txStr] = runeId.split(':')
  const runestone: RunestoneSpec = {
    mint: {
      block: BigInt(blockStr),
      tx: parseInt(txStr, 10),
    },
    pointer,
  }
  return encodeRunestone(runestone).encodedRunestone
}

export const createRuneEtchScript = ({
  pointer = 0,
  runeName,
  symbol,
  divisibility,
  perMintAmount,
  premine = 0,
  cap,
  turbo,
}: {
  pointer?: number
  runeName: string
  symbol: string
  divisibility?: number
  perMintAmount: number
  cap?: number
  premine?: number
  turbo?: boolean
}) => {
  const runeEtch = encodeRunestone({
    etching: {
      divisibility,
      premine: BigInt(premine),
      runeName,
      symbol,
      terms: {
        cap: cap ? BigInt(cap) : undefined,
        amount: perMintAmount ? BigInt(perMintAmount) : undefined,
      },
      turbo,
    },
    pointer,
  }).encodedRunestone
  return runeEtch
}