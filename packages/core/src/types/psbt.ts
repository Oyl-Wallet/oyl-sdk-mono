export type Base64Psbt = string & { readonly __brand: 'Base64Psbt' }

export type PsbtInput = {
  tapInternalKey?: Buffer
  tapKeySig?: Buffer
  tapLeafScript?: Array<{
    leafVersion: number
    script: Buffer
    controlBlock: Buffer
  }>
  witnessUtxo?: {
    value: number
    script: Buffer
  }
  redeemScript?: Buffer
  witnessScript?: Buffer
  finalScriptSig?: Buffer
  finalScriptWitness?: Buffer
  sighashType?: number
  [key: string]: any // For any other properties
}