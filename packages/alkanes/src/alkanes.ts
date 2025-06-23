import * as bitcoin from 'bitcoinjs-lib'
import {
  encipher,
  encodeRunestoneProtostone,
  p2tr_ord_reveal,
  ProtoStone,
} from 'alkanes/lib/index'
import { ProtoruneEdict } from 'alkanes/lib/protorune/protoruneedict'
import {
  addUtxoInputs,
  Signer,
  getAddressType,
  getPsbtFee,
  findXAmountOfSats,
  addTaprootInternalPubkey,
  getOutputValueByVOutIndex,
  getVSize,
  inscriptionSats,
  tweakSigner,
  OylTransactionError,
  AlkanesPayload,
  minimumFee,
  pushPsbt,
  BTC_DUST_AMOUNT,
  MIN_RELAY_FEE,
  DEFAULT_SEND_FEE,
  UTXO_ASSET_SAT_THRESHOLD,
  getAddressSpendableUtxoSet,
} from '@oyl/sdk-core'
import { TokenWithAmount } from './types'
import type { Account, Provider, FormattedUtxo, Base64Psbt, AlkaneId, AlkaneToken, AlkanesOutpoint } from '@oyl/sdk-core'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341'
import { actualDeployCommitFee } from './contract'
import { selectSpendableUtxos } from '@oyl/sdk-core'

export interface ProtostoneMessage {
  protocolTag?: bigint
  edicts?: ProtoruneEdict[]
  pointer?: number
  refundPointer?: number
  calldata: bigint[]
}

export const encodeProtostone = ({
  protocolTag = 1n,
  edicts = [],
  pointer = 0,
  refundPointer = 0,
  calldata,
}: ProtostoneMessage) => {
  return encodeRunestoneProtostone({
    protostones: [
      ProtoStone.message({
        protocolTag,
        edicts,
        pointer,
        refundPointer,
        calldata: encipher(calldata),
      }),
    ],
  }).encodedRunestone
}

export function parseAlkaneId(alkaneId: string): AlkaneId {
  const [block, tx] = alkaneId.split(':');

  if (!block || !tx) {
    throw new Error('Invalid alkaneId format');
  }

  return {
    block,
    tx,
  };
}

export const filterAlkaneOutpointsById = ({
  alkaneOutpoints,
  alkaneId,
}: {
  alkaneOutpoints: AlkanesOutpoint[]
  alkaneId: AlkaneId
}) => {
  const matchingAlkanes: AlkanesOutpoint[] = [];
  
  alkaneOutpoints.forEach(outpoint => {
    outpoint.runes.forEach(rune => {
      if (Number(rune.rune.id.block) === Number(alkaneId.block) && 
          Number(rune.rune.id.tx) === Number(alkaneId.tx)) {
        matchingAlkanes.push(outpoint);
      }
    });
  });
  
  // Remove duplicates (same outpoint might have multiple runes)
  const uniqueOutpoints = matchingAlkanes.filter((outpoint, index, self) => 
    index === self.findIndex(o => o.outpoint.txid === outpoint.outpoint.txid && o.outpoint.vout === outpoint.outpoint.vout)
  );

  // Sort by total balance of the target alkane in each outpoint
  uniqueOutpoints.sort((a, b) => {
    const aBalance = a.runes.find(r => 
      Number(r.rune.id.block) === Number(alkaneId.block) && 
      Number(r.rune.id.tx) === Number(alkaneId.tx)
    )?.balance || "0";
    const bBalance = b.runes.find(r => 
      Number(r.rune.id.block) === Number(alkaneId.block) && 
      Number(r.rune.id.tx) === Number(alkaneId.tx)
    )?.balance || "0";
    return Number(bBalance) - Number(aBalance); // Largest to smallest
  });

  return uniqueOutpoints;
}

/**
 * Takes in a list of tokens and amounts and returns the utxos that are needed to cover the amount of each token
 * @param param0 
 * @returns 
 */
export async function getAddressAlkaneUtxoSet({
  address,
  tokens,
  sortUtxosGreatestToLeast = true,
  provider,
  allowPartial = false,
}: {
  address: string
  tokens: TokenWithAmount[]
  sortUtxosGreatestToLeast?: boolean
  provider: Provider
  allowPartial?: boolean
}): Promise<{ utxos: FormattedUtxo[], totalAmount: number, hasEnough: boolean }> {
  const addressType = getAddressType(address);

  if (!addressType) {
    throw new Error('Invalid address');
  }

  // get alkanes for address
  const outpoints = await provider.alkanes.getAlkanesByAddress({
    address
  })

  const selectedOutpoints: AlkanesOutpoint[] = [];
  const tokenAmountsNeeded = new Map<string, bigint>();
  
  // Initialize token amounts needed
  for (const token of tokens) {
    const tokenKey = `${token.id.block}:${token.id.tx}`;
    tokenAmountsNeeded.set(tokenKey, token.amount);
  }

  // For each token, find outpoints that contain enough balance
  for (const token of tokens) {
    const tokenKey = `${token.id.block}:${token.id.tx}`;
    const amountNeeded = tokenAmountsNeeded.get(tokenKey) || 0n;
    
    if (amountNeeded <= 0n) continue;

    const targetOutpoints = filterAlkaneOutpointsById({
      alkaneOutpoints: outpoints,
      alkaneId: token.id,
    });

    let remainingAmount = amountNeeded;

    for (const outpoint of targetOutpoints) {
      if (remainingAmount <= 0n) break;

      // Find the balance of this specific token in this outpoint
      const tokenRune = outpoint.runes.find(rune => 
        Number(rune.rune.id.block) === Number(token.id.block) && 
        Number(rune.rune.id.tx) === Number(token.id.tx)
      );

      if (!tokenRune) continue;

      const balance = BigInt(tokenRune.balance);
      const amountToUse = balance > remainingAmount ? remainingAmount : balance;

      // Add this outpoint to selected outpoints if not already included
      const outpointKey = `${outpoint.outpoint.txid}:${outpoint.outpoint.vout}`;
      const alreadySelected = selectedOutpoints.some(op => 
        `${op.outpoint.txid}:${op.outpoint.vout}` === outpointKey
      );

      if (!alreadySelected) {
        selectedOutpoints.push(outpoint);
      }

      remainingAmount -= amountToUse;
    }

    // Update remaining amount needed for this token
    tokenAmountsNeeded.set(tokenKey, remainingAmount);
  }

  // Check if we have enough for all tokens
  const hasEnough = Array.from(tokenAmountsNeeded.values()).every(amount => amount <= 0n);

  // Convert selected outpoints to FormattedUtxo format
  const utxos: FormattedUtxo[] = selectedOutpoints.map(outpoint => ({
    txId: outpoint.outpoint.txid,
    outputIndex: outpoint.outpoint.vout,
    satoshis: Number(outpoint.output.value),
    address: address, // We'll need to derive this from the script
    scriptPk: outpoint.output.script,
    height: outpoint.height,
    inscriptions: [],
    runes: {},
    alkanes: {},
    confirmations: 0,
    indexed: true,
  }));

  const totalAmount = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);

  // If we get here, we didn't find enough valid UTXOs
  if (!hasEnough && !allowPartial) {
    throw new Error('Insufficient balance of alkanes to cover spend amounts.');
  }
  
  return { utxos, totalAmount, hasEnough };
}

// create a function that takes in an account and uses the account.spendStrategy to get the utxos from each address
export const getAccountAlkaneUtxoSet = async ({
  tokens,
  account,
  provider,
}: {
  tokens: TokenWithAmount[]
  account: Account
  provider: Provider
}): Promise<{ utxos: FormattedUtxo[], totalAmount: number }> => {
  let totalAmount = 0;
  const allSelectedUtxos: FormattedUtxo[] = [];
  
  // Iterate through addresses in the spend strategy order
  for (const addressKey of account.spendStrategy.addressOrder) {
    const address = account[addressKey].address;
    console.log('Getting utxos from address: ', address)
    
    try {
      // Try to get UTXOs from this address, allowing partial results
      const { utxos: addressUtxos, totalAmount: addressTotalAmount, hasEnough } = await getAddressAlkaneUtxoSet({
        address,
        tokens,
        sortUtxosGreatestToLeast: account.spendStrategy.utxoSortGreatestToLeast,
        provider,
        allowPartial: true,
      });

      // Add UTXOs from this address to our collection
      allSelectedUtxos.push(...addressUtxos);
      totalAmount += addressTotalAmount;
      
      // If we have enough from this address, we're done
      if (hasEnough) {
        return { utxos: allSelectedUtxos, totalAmount };
      }
      
    } catch (error) {
      // If this address fails, continue to the next one
      console.warn(`Failed to get UTXOs from address ${address}:`, error);
      continue;
    }
  }
  
  // If we get here, we didn't find enough UTXOs across all addresses
  throw new Error('Insufficient balance across all addresses to cover spend amount and fee.');
}


export const alkanesExecutePsbt = async ({
  protostone,
  utxos,
  alkanesUtxos,
  appFee,
  feeAddress,
  fee,
  account,
  provider
}: {
  protostone: Buffer
  utxos: FormattedUtxo[]
  alkanesUtxos?: FormattedUtxo[]
  appFee?: bigint
  feeAddress?: string
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
    if (appFee && !feeAddress) {
      throw new OylTransactionError(new Error('feeAddress required when appFee is set'))
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

    psbt.addOutput({ address: account.taproot.address, value: MIN_RELAY_FEE })

    psbt.addOutput({ script: protostone, value: 0 })

    let frontendFeeAmount = 0

    if (feeAddress && appFee && appFee > BigInt(BTC_DUST_AMOUNT)) {
      psbt.addOutput({
        address: feeAddress,
        value: Number(appFee),
      })
      frontendFeeAmount = Number(appFee)
    }

    const changeAmount = totalUtxoInputAmount + totalAlkanesInputAmount - MIN_RELAY_FEE - frontendFeeAmount - fee

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

export const createAlkanesExecutePsbt = async ({
  protostone,
  utxos,
  alkanesUtxos,
  appFee,
  feeAddress,
  feeRate,
  account,
  provider,
}: {
  protostone: Buffer
  utxos: FormattedUtxo[]
  alkanesUtxos?: FormattedUtxo[]
  appFee?: bigint
  feeAddress?: string
  feeRate: number
  account: Account
  provider: Provider
}) => {
  const effectiveFeeRate = feeRate ?? (await provider.esplora.getFeeEstimates())['1']
// First create a psbt with a minimum fee
  const { psbt } = await alkanesExecutePsbt({
    protostone,
    utxos,
    alkanesUtxos,
    appFee,
    feeAddress,
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
  const { psbt: finalPsbt } = await alkanesExecutePsbt({
    protostone,
    utxos,
    alkanesUtxos,
    appFee,
    feeAddress,
    fee,
    account,
    provider,
  })

  return { psbt: finalPsbt, fee, vsize }
}



export const createDeployCommitPsbt = async ({
  payload,
  utxos,
  tweakedPublicKey,
  account,
  provider,
  feeRate,
  fee,
}: {
  payload: AlkanesPayload
  utxos: FormattedUtxo[]
  tweakedPublicKey: string
  account: Account
  provider: Provider
  feeRate?: number
  fee?: number
}): Promise<{ psbt: Base64Psbt, script: Buffer }> => {
  try {
    let gatheredUtxos = selectSpendableUtxos(utxos, account.spendStrategy)

    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    const calculatedFee = minFee * feeRate! < 250 ? 250 : minFee * feeRate!
    let finalFee = fee ? fee : calculatedFee

    let psbt = new bitcoin.Psbt({ network: provider.getNetwork() })

    const script = Buffer.from(
      p2tr_ord_reveal(toXOnly(Buffer.from(tweakedPublicKey, 'hex')), [payload])
        .script
    )

    const inscriberInfo = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(Buffer.from(tweakedPublicKey, 'hex')),
      scriptTree: {
        output: script,
      },
      network: provider.getNetwork(),
    })

    const wasmDeploySize = getVSize(Buffer.from(payload.body)) * feeRate!

    gatheredUtxos = findXAmountOfSats(
      [...utxos],
      wasmDeploySize + Number(inscriptionSats) + finalFee * 2
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
          [...utxos],
          wasmDeploySize + Number(inscriptionSats) + finalFee * 2
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

    if (
      gatheredUtxos.totalAmount <
      finalFee * 2 + inscriptionSats + wasmDeploySize
    ) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

    psbt.addOutput({
      value: finalFee + wasmDeploySize + 546,
      address: inscriberInfo.address!,
    })

    const changeAmount =
      gatheredUtxos.totalAmount -
      (finalFee * 2 + wasmDeploySize + inscriptionSats)

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = addTaprootInternalPubkey({
      psbt,
      taprootInternalPubkey: account.taproot.pubkey,
      network: provider.getNetwork(),
    })

    return { psbt: formattedPsbtTx.toBase64() as Base64Psbt, script }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const deployCommit = async ({
  payload,
  utxos,
  account,
  provider,
  feeRate,
  signer,
}: {
  payload: AlkanesPayload
  utxos: FormattedUtxo[]
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.getNetwork(),
    }
  )

  const tweakedPublicKey = tweakedTaprootKeyPair.publicKey.toString('hex')

  const { fee: commitFee } = await actualDeployCommitFee({
    payload,
    utxos,
    tweakedPublicKey,
    account,
    provider,
    feeRate,
  })

  const { psbt: finalPsbt, script } = await createDeployCommitPsbt({
    payload,
    utxos,
    tweakedPublicKey,
    account,
    provider,
    feeRate,
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

export const createDeployRevealPsbt = async ({
  protostone,
  receiverAddress,
  script,
  feeRate,
  tweakedPublicKey,
  provider,
  fee = 0,
  commitTxId,
}: {
  protostone: Buffer
  receiverAddress: string
  script: Buffer
  feeRate: number
  tweakedPublicKey: string
  provider: Provider
  fee?: number
  commitTxId: string
}): Promise<{ psbt: Base64Psbt, fee: number }> => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
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
      throw new OylTransactionError(new Error('Error getting vin #0 value'))
    }

    const p2pk_redeem = { output: script }

    const { output, witness } = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(Buffer.from(tweakedPublicKey, 'hex')),
      scriptTree: p2pk_redeem,
      redeem: p2pk_redeem,
      network: provider.getNetwork(),
    })

    if (!output) {
      throw new OylTransactionError(new Error('Failed to generate output script'))
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

    psbt.addOutput({
      value: 546,
      address: receiverAddress,
    })

    psbt.addOutput({
      value: 0,
      script: protostone,
    })

    if (revealTxChange > 546) {
      psbt.addOutput({
        value: revealTxChange,
        address: receiverAddress,
      })
    }

    return {
      psbt: psbt.toBase64() as Base64Psbt,
      fee: revealTxChange,
    }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const deployReveal = async ({
  protostone,
  commitTxId,
  script,
  account,
  provider,
  feeRate,
  signer,
}: {
  protostone: Buffer
  commitTxId: string
  script: string
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.getNetwork(),
    }
  )

  const tweakedPublicKey = tweakedTaprootKeyPair.publicKey.toString('hex')

  const effectiveFeeRate = feeRate ?? (await provider.esplora.getFeeEstimates())['1']

  const { fee } = await actualTransactRevealFee({
    protostone,
    tweakedPublicKey,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    provider,
    feeRate: effectiveFeeRate,
  })

  const { psbt: finalRevealPsbt } = await createTransactReveal({
    protostone,
    tweakedPublicKey,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    provider,
    feeRate: effectiveFeeRate,
    fee,
  })

  let finalReveal = bitcoin.Psbt.fromBase64(finalRevealPsbt, {
    network: provider.getNetwork(),
  })

  finalReveal.signInput(0, tweakedTaprootKeyPair)
  finalReveal.finalizeInput(0)

  const finalSignedPsbt = finalReveal.toBase64()

  const revealResult = await pushPsbt({
    psbtBase64: finalSignedPsbt,
    provider,
  })

  return revealResult
}

export const actualTransactRevealFee = async ({
  protostone,
  tweakedPublicKey,
  commitTxId,
  receiverAddress,
  script,
  provider,
  feeRate,
}: {
  protostone: Buffer
  tweakedPublicKey: string
  commitTxId: string
  receiverAddress: string
  script: Buffer
  provider: Provider
  feeRate?: number
}) => {
  const effectiveFeeRate = feeRate ?? (await provider.esplora.getFeeEstimates())['1']

  const { psbt } = await createTransactReveal({
    protostone,
    commitTxId,
    receiverAddress,
    script,
    tweakedPublicKey,
    provider,
    feeRate: effectiveFeeRate,
  })

  const { fee: estimatedFee } = getPsbtFee({
    feeRate: effectiveFeeRate,
    psbt,
    provider,
  })

  const { psbt: finalPsbt } = await createTransactReveal({
    protostone,
    commitTxId,
    receiverAddress,
    script,
    tweakedPublicKey,
    provider,
    feeRate: effectiveFeeRate,
    fee: estimatedFee,
  })

  const { fee: finalFee, vsize } = await getPsbtFee({
    feeRate: effectiveFeeRate,
    psbt: finalPsbt,
    provider,
  })

  return { fee: finalFee, vsize }
}

export const createTransactReveal = async ({
  protostone,
  receiverAddress,
  script,
  feeRate,
  tweakedPublicKey,
  provider,
  fee = 0,
  commitTxId,
}: {
  protostone: Buffer
  receiverAddress: string
  script: Buffer
  feeRate: number
  tweakedPublicKey: string
  provider: Provider
  fee?: number
  commitTxId: string
}): Promise<{ psbt: Base64Psbt, fee: number }> => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.getNetwork() })
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
      throw new OylTransactionError(new Error('Error getting vin #0 value'))
    }

    const p2pk_redeem = { output: script }

    const { output, witness } = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(Buffer.from(tweakedPublicKey, 'hex')),
      scriptTree: p2pk_redeem,
      redeem: p2pk_redeem,
      network: provider.getNetwork(),
    })

    if (!output) {
      throw new OylTransactionError(new Error('Failed to generate output script'))
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

    psbt.addOutput({
      value: 546,
      address: receiverAddress,
    })

    psbt.addOutput({
      value: 0,
      script: protostone,
    })

    if (revealTxChange > 546) {
      psbt.addOutput({
        value: revealTxChange,
        address: receiverAddress,
      })
    }

    return {
      psbt: psbt.toBase64() as Base64Psbt,
      fee: revealTxChange,
    }
  } catch (error) {
    throw new OylTransactionError(error as Error)
  }
}

export const toTxId = (rawLeTxid: string) =>
  Buffer.from(rawLeTxid, 'hex').reverse().toString('hex')
