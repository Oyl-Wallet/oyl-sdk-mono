import { minimumFee, createPsbt, findXAmountOfSats } from './btc'
import { Provider } from '@oyl-sdk/core'
import { Account } from '@oyl-sdk/core'
import { FormattedUtxo } from '@utxo/utxo'

describe('BTC', () => {
  describe('minimumFee', () => {
    it('should calculate minimum fee correctly', () => {
      const fee = minimumFee({
        taprootInputCount: 2,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      expect(fee).toBe(42)
    })
  })

  describe('findXAmountOfSats', () => {
    it('should find sufficient UTXOs', () => {
      const utxos: FormattedUtxo[] = [
        {
          txId: 'tx1',
          outputIndex: 0,
          scriptPk: 'script1',
          address: 'address1',
          satoshis: 1000,
          inscriptions: [],
          confirmations: 0,
        },
        {
          txId: 'tx2',
          outputIndex: 0,
          scriptPk: 'script2',
          address: 'address2',
          satoshis: 2000,
          inscriptions: [],
          confirmations: 0,
        },
      ]

      const result = findXAmountOfSats(utxos, 1500)
      expect(result.totalAmount).toBe(1000)
      expect(result.utxos.length).toBe(1)
    })

    it('should throw error for insufficient balance', () => {
      const utxos: FormattedUtxo[] = [
        {
          txId: 'tx1',
          outputIndex: 0,
          scriptPk: 'script1',
          address: 'address1',
          satoshis: 1000,
          inscriptions: [],
          confirmations: 0,
        },
      ]

      expect(() => findXAmountOfSats(utxos, 2000)).toThrow('Insufficient balance')
    })
  })

  describe('createPsbt', () => {
    it('should create PSBT with correct inputs and outputs', async () => {
      const mockProvider = {
        network: 'testnet',
        esplora: {
          getTxHex: jest.fn().mockResolvedValue('mockTxHex'),
        },
      } as unknown as Provider

      const mockAccount = {
        taproot: {
          address: 'taprootAddress',
          pubkey: 'taprootPubkey',
        },
        nestedSegwit: {
          pubkey: 'nestedPubkey',
        },
        spendStrategy: {
          changeAddress: 'taproot',
        },
      } as unknown as Account

      const mockUtxos = {
        utxos: [
          {
            txId: 'tx1',
            outputIndex: 0,
            scriptPk: 'script1',
            address: 'address1',
            satoshis: 1000,
            inscriptions: [],
            confirmations: 0,
          },
        ],
        totalAmount: 1000,
      }

      const result = await createPsbt({
        gatheredUtxos: mockUtxos,
        account: mockAccount,
        provider: mockProvider,
        feeRate: 1,
      })

      expect(result.psbt).toBeDefined()
    })
  })
}) 