export type OrdOutputRune = {
  amount: number
  divisibility: number
}

export interface OrdOutput {
  address: string
  indexed: boolean
  inscriptions: string[]
  runes: Record<string, OrdOutputRune> | OrdOutputRune[][]
  sat_ranges: number[][]
  script_pubkey: string
  spent: boolean
  transaction: string
  value: number
  output?: string
}

export type OrdCollectibleData = {
  address: string
  children: any[]
  content_length: number
  content_type: string
  genesis_fee: number
  genesis_height: number
  inscription_id: string
  inscription_number: number
  next: string
  output_value: number
  parent: any
  previous: string
  rune: any
  sat: number
  satpoint: string
  timestamp: number
}