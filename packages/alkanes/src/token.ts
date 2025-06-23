import { u128, u32 } from '@magiceden-oss/runestone-lib/dist/src/integer'
import { ProtoStone, encodeRunestoneProtostone } from 'alkanes/lib/index.js'
import { ProtoruneRuneId } from 'alkanes/lib/protorune/protoruneruneid'
import * as bitcoin from 'bitcoinjs-lib'
import {
  addUtxoInputs,
  BTC_DUST_AMOUNT,
  DEFAULT_SEND_FEE,
  INSCRIPTION_SATS,
  Account,
  Signer,
  Provider,
  AlkanesPayload,
  OylTransactionError,
  timeout,
  findXAmountOfSats,
  addTaprootInternalPubkey,
  getAddressType,
  minimumFee,
  FormattedUtxo,
  GatheredUtxos,
  getPsbtFee,
  pushPsbt,
  Base64Psbt,
} from '@oyl/sdk-core'
import { deployCommit, deployReveal } from './alkanes'


export const alkanesSendPsbt = async ({
  utxos,
  alkanesUtxos,
  toAddress,
  alkaneId,
  amount,
  fee,
  account,
  provider
}: {
  utxos: FormattedUtxo[]
  alkanesUtxos: FormattedUtxo[]
  toAddress: string
  alkaneId: { block: string; tx: string }
  amount: number
  fee: number
  account: Account
  provider: Provider
}): Promise<{ psbt: Base64Psbt }> => {
  try {
    if (!utxos?.length) {
      throw new OylTransactionError(new Error('No utxos provided'))
    }
    if (!fee) {
      throw new OylTransactionError(new Error('No fee provided'))
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({
      network: provider.getNetwork(),
    })

    await addUtxoInputs({
      psbt,
      utxos,
      esploraProvider: provider.esplora,
    })

    const totalUtxoInputAmount = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)

    let totalAlkanesInputAmount = 0

    if (alkanesUtxos) {
      await addUtxoInputs({
        psbt,
        utxos: alkanesUtxos,
        esploraProvider: provider.esplora,
      })
      totalAlkanesInputAmount = alkanesUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
    }

    const protostone = encodeRunestoneProtostone({
      protostones: [
        ProtoStone.message({
          protocolTag: 1n,
          edicts: [
            {
              id: new ProtoruneRuneId(
                u128(BigInt(alkaneId.block)),
                u128(BigInt(alkaneId.tx))
              ),
              amount: u128(BigInt(amount)),
              output: u32(BigInt(1)),
            },
          ],
          pointer: 0,
          refundPointer: 0,
          calldata: Buffer.from([]),
        }),
      ],
    }).encodedRunestone

    psbt.addOutput({
      value: INSCRIPTION_SATS,
      address: account.taproot.address,
    })

    psbt.addOutput({
      value: INSCRIPTION_SATS,
      address: toAddress,
    })

    psbt.addOutput({ script: protostone, value: 0 })

    const changeAmount = totalUtxoInputAmount + totalAlkanesInputAmount - (INSCRIPTION_SATS * 2) - fee

    if (changeAmount < 0) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }
    
    if (changeAmount > BTC_DUST_AMOUNT) {
      psbt.addOutput({
        address: account[account.spendStrategy.changeAddress].address,
        value: changeAmount,
      })
    }

    const formatted = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return { psbt: formatted.toBase64() as Base64Psbt }
  } catch (err) {
    throw new OylTransactionError(err as Error)
  }
}

export const createAlkanesSendPsbt = async ({
  utxos,
  alkanesUtxos,
  toAddress,
  alkaneId,
  amount,
  feeRate,
  account,
  provider,
}: {
  utxos: FormattedUtxo[]
  alkanesUtxos: FormattedUtxo[]
  toAddress: string
  alkaneId: { block: string; tx: string }
  amount: number
  feeRate: number
  account: Account
  provider: Provider
}) => {
// First create a psbt with a minimum fee
  const { psbt } = await alkanesSendPsbt({
    utxos,
    alkanesUtxos,
    toAddress,
    alkaneId,
    amount,
    fee: DEFAULT_SEND_FEE,
    account,
    provider,
  })
  

  // Then use the target feeRate to get the actual fee for the psbt
  const { fee, vsize } = getPsbtFee({
    feeRate,
    psbt,
    provider,
  })

  // Reconstruct the psbt with the actual fee
  const { psbt: finalPsbt } = await alkanesSendPsbt({
    utxos,
    alkanesUtxos,
    toAddress,
    alkaneId,
    amount,
    fee,
    account,
    provider,
  })

  return { psbt: finalPsbt, fee, vsize }
}




export const tokenDeployment = async ({
  payload,
  utxos,
  account,
  protostone,
  provider,
  feeRate,
  signer,
}: {
  payload: AlkanesPayload
  utxos: FormattedUtxo[]
  account: Account
  protostone: Buffer
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const { script, txId } = await deployCommit({
    payload,
    utxos,
    account,
    provider,
    feeRate,
    signer,
  })

  await timeout(3000)

  const reveal = await deployReveal({
    protostone,
    script,
    commitTxId: txId,
    account,
    provider,
    feeRate,
    signer,
  })

  return { ...reveal, commitTx: txId }
}

export const split = async ({
  alkaneUtxos,
  gatheredUtxos,
  account,
  protostone,
  provider,
  feeRate,
  signer,
}: {
  alkaneUtxos?: GatheredUtxos
  gatheredUtxos: GatheredUtxos
  account: Account
  protostone: Buffer
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const effectiveFeeRate = feeRate ?? (await provider.esplora.getFeeEstimates())['1']

  const { fee } = await actualSplitFee({
    alkaneUtxos,
    gatheredUtxos,
    account,
    protostone,
    provider,
    feeRate: effectiveFeeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createSplitPsbt({
    alkaneUtxos,
    gatheredUtxos,
    account,
    protostone,
    provider,
    feeRate: effectiveFeeRate,
    fee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const revealResult = await pushPsbt({
    psbtBase64: signedPsbt,
    provider,
  })

  return revealResult
}

export const createSplitPsbt = async ({
  alkaneUtxos,
  gatheredUtxos,
  account,
  protostone,
  provider,
  feeRate,
  fee = 0,
}: {
  alkaneUtxos?: GatheredUtxos
  gatheredUtxos: GatheredUtxos
  account: Account
  protostone: Buffer
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const effectiveFeeRate = feeRate ?? (await provider.esplora.getFeeEstimates())['1']

    const originalGatheredUtxos = gatheredUtxos

    const minTxSize = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    let calculatedFee = Math.max(minTxSize * effectiveFeeRate, 250)
    let finalFee = fee === 0 ? calculatedFee : fee

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee) + 546 * alkaneUtxos!.utxos.length * 2
    )

    let psbt = new bitcoin.Psbt({ network: provider.getNetwork() })

    if (alkaneUtxos) {
      for await (const utxo of alkaneUtxos.utxos) {
        if (getAddressType(utxo.address) === 0) {
          const previousTxHex: string = await provider.esplora.getTxHex(
            utxo.txId
          )
          psbt.addInput({
            hash: utxo.txId,
            index: utxo.outputIndex,
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
            index: utxo.outputIndex,
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
            index: utxo.outputIndex,
            witnessUtxo: {
              value: utxo.satoshis,
              script: Buffer.from(utxo.scriptPk, 'hex'),
            },
          })
        }
      }
    }

    if (fee === 0 && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * effectiveFeeRate < 250 ? 250 : txSize * effectiveFeeRate

      if (gatheredUtxos.totalAmount < finalFee) {
        throw new OylTransactionError(Error('Insufficient Balance'))
      }
    }

    if (gatheredUtxos.totalAmount < finalFee) {
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

    for (let i = 0; i < alkaneUtxos!.utxos.length * 2; i++) {
      psbt.addOutput({
        address: account.taproot.address,
        value: 546,
      })
    }

    const output = { script: protostone, value: 0 }
    psbt.addOutput(output)

    const changeAmount =
      gatheredUtxos.totalAmount +
      (alkaneUtxos?.totalAmount || 0) -
      finalFee -
      546 * alkaneUtxos!.utxos.length * 2

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return {
      psbt: formattedPsbtTx.toBase64(),
      psbtHex: formattedPsbtTx.toHex(),
    }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const actualSplitFee = async ({
  gatheredUtxos,
  account,
  protostone,
  provider,
  feeRate,
  signer,
  alkaneUtxos,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  protostone: Buffer
  provider: Provider
  feeRate: number
  signer: Signer
  alkaneUtxos?: GatheredUtxos
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createSplitPsbt({
    gatheredUtxos,
    account,
    protostone,
    provider,
    feeRate,
    alkaneUtxos,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })
    .extractTransaction()
    .toHex()

  if (!provider.sandshrew.bitcoindRpc.testMemPoolAccept) {
    throw new Error('testMemPoolAccept method not available')
  }
  
  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([rawPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate

  const { psbt: finalPsbt } = await createSplitPsbt({
    gatheredUtxos,
    account,
    protostone,
    provider,
    feeRate,
    alkaneUtxos,
    fee: correctFee,
  })

  const { signedPsbt: finalSignedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(finalSignedPsbt, {
    network: account.network,
  })
    .extractTransaction()
    .toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalRawPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate

  return { fee: finalFee }
}