import * as bitcoin from 'bitcoinjs-lib'
import { Provider } from '../provider'
import { FormattedUtxo, AddressType } from '../types'
import { getAddressType } from '../account'
import { EsploraRpc } from '../rpc/esplora'
import { OylTransactionError } from '../shared/errors'
import { PsbtInput } from '../types/psbt'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { Base64Psbt } from '../types/psbt'

function extractPublicKeyFromNestedSegwit(txHex: string, inputIndex: number): Buffer | undefined {
  const tx = bitcoin.Transaction.fromHex(txHex);
  const input = tx.ins[inputIndex];
  
  // For nested segwit, public key is in witness[1]
  if (input.witness && input.witness.length >= 2) {
    return input.witness[1]; // This is your public key
  }
  
  return undefined;
}

const detectInputType = (input: PsbtInput): "p2tr" | "p2wpkh" | "p2sh" | "p2pkh" => {
  if (input.tapInternalKey || input.tapKeySig || input.tapLeafScript) {
    return "p2tr";
  }

  if (input.witnessUtxo?.script) {
    const scriptLen = input.witnessUtxo.script.length;
    if (scriptLen === 34) return "p2tr";
    if (scriptLen === 22) return "p2wpkh";
    if (scriptLen === 23) return "p2sh";
    if (scriptLen === 25) return "p2pkh";
  }

  if (input.redeemScript) return "p2sh";
  if (input.witnessScript) return "p2wpkh";

  throw new OylTransactionError(new Error('Input type not supported'))
};

export const addUtxoInputs = async ({
  psbt,
  utxos,
  esploraProvider,
}: {
  psbt: bitcoin.Psbt
  utxos: FormattedUtxo[]
  esploraProvider: EsploraRpc
}) => {
  for (const utxo of utxos) {
    const type = getAddressType(utxo.address);
    switch (type) {
      case AddressType.P2PKH: {
        // legacy
        const previousTxHex: string = await esploraProvider.getTxHex(utxo.txId)
        psbt.addInput({
          hash: utxo.txId,
          index: +utxo.outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
        break;
      }
      case AddressType.P2SH_P2WPKH: {
        // nested segwit
        const publicKey = extractPublicKeyFromNestedSegwit(utxo.txId, utxo.outputIndex);
        if (!publicKey) {
          throw new OylTransactionError(new Error('Public key not found'))
        }
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(publicKey),
        ])
        psbt.addInput({
          hash: utxo.txId,
          index: +utxo.outputIndex,
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
        break
      }
      case AddressType.P2WPKH: 
      case AddressType.P2TR:
      default: {
        psbt.addInput({
          hash: utxo.txId,
          index: +utxo.outputIndex,
          witnessUtxo: {
            value: utxo.satoshis,
            script: Buffer.from(utxo.scriptPk, 'hex'),
          },
        })
        break;  
      }
    }
  }
}

/**
 * Prepares PSBT inputs for signing by adding missing tapInternalKey values to Taproot (P2TR) inputs only
 */
export const addTaprootInternalPubkey = ({
  psbt,
  taprootInternalPubkey,
  network,
}: {
  psbt: bitcoin.Psbt
  taprootInternalPubkey: string
  network: bitcoin.Network
}): bitcoin.Psbt => {
  let index = 0
  for (const v of psbt.data.inputs) {
    const isSigned = v.finalScriptSig || v.finalScriptWitness
    const lostInternalPubkey = !v.tapInternalKey
    if (!isSigned || lostInternalPubkey) {
      const tapInternalKey = toXOnly(Buffer.from(taprootInternalPubkey, 'hex'))
      const p2tr = bitcoin.payments.p2tr({
        internalPubkey: tapInternalKey,
        network: network,
      })
      if (
        v.witnessUtxo?.script.toString('hex') === p2tr.output?.toString('hex')
      ) {
        v.tapInternalKey = tapInternalKey
      }
    }
    index++
  }
  return psbt
}

const getTaprootWitnessSize = (input: PsbtInput): number => {
  // Base taproot witness size (signature)
  let witnessSize = 16.25; // 65 bytes / 4 (witness discount)

  // If there's a reveal script
  if (input.tapLeafScript && input.tapLeafScript.length > 0) {
    const leafScript = input.tapLeafScript[0];
    // Add control block size (33 bytes + path length) / 4
    witnessSize += (33 + (leafScript.controlBlock.length - 33)) / 4;
    // Add script size / 4
    witnessSize += leafScript.script.length / 4;
    // Add any witness stack items / 4
    if (input.witnessStack) {
      witnessSize += input.witnessStack.reduce((sum: number, item: Buffer) => sum + item.length, 0) / 4;
    }
  }
  return witnessSize;
};

const SIZES = {
  p2tr: {
    input: { 
      unsigned: 41,
      witness: 16.25,  // Fallback
      getWitnessSize: getTaprootWitnessSize
    },
    output: 43,
  },
  p2wpkh: {
    input: { 
      unsigned: 41, 
      witness: 26.5,
      getWitnessSize: () => 26.5  // Fixed witness size
    },
    output: 31,
  },
  p2sh: {
    input: { 
      unsigned: 63, 
      witness: 27.75,
      getWitnessSize: () => 27.75  // Fixed witness size
    },
    output: 32,
  },
  p2pkh: {
    input: { 
      unsigned: 148, 
      witness: 0,
      getWitnessSize: () => 0  // No witness data
    },
    output: 34,
  },
  // OP_RETURN
  nulldata: {
    output: 9, // Base size
  }
};

export const getPsbtFee = ({
  feeRate,
  psbt,
  provider,
}: {
  feeRate: number
  psbt: Base64Psbt
  provider: Provider
}): { fee: number; vsize: number } => {
  const psbtObj = bitcoin.Psbt.fromBase64(psbt, { network: provider.getNetwork() });

  // Base overhead
  const BASE_OVERHEAD = 8; // Version (4) + Locktime (4)
  const SEGWIT_OVERHEAD = 1;

  // VarInt sizes depend on number of inputs/outputs
  const getVarIntSize = (n: number) => {
    if (n < 0xfd) return 1;
    if (n < 0xffff) return 3;
    if (n < 0xffffffff) return 5;
    return 9;
  };

  // Calculate input sizes
  const inputSizes = psbtObj.data.inputs.map((input) => {
    const type = detectInputType(input);
    const size = SIZES[type].input.unsigned + SIZES[type].input.getWitnessSize(input);
    return size;
  });

  // Calculate output sizes
  const outputSizes = psbtObj.txOutputs.map((output) => {
    // Check if OP_RETURN output
    if (output.script[0] === 0x6a) {
      return output.script.length + SIZES.nulldata.output; 
    }

    const scriptType =
      output.script.length === 34
        ? "p2tr"
        : output.script.length === 22
          ? "p2wpkh"
          : output.script.length === 23
            ? "p2sh"
            : "p2pkh";

    return SIZES[scriptType].output;
  });

  const totalInputSize = inputSizes.reduce((sum, size) => sum + size, 0);
  const totalOutputSize = outputSizes.reduce((sum, size) => sum + size, 0);

  const inputVarIntSize = getVarIntSize(inputSizes.length);
  const outputVarIntSize = getVarIntSize(outputSizes.length);

  const vsize = Math.round(
    BASE_OVERHEAD + 
    SEGWIT_OVERHEAD + 
    inputVarIntSize +
    outputVarIntSize +
    totalInputSize + 
    totalOutputSize
  );

  const fee = Math.ceil(vsize * feeRate);

  return {
    fee,
    vsize,
  };
};