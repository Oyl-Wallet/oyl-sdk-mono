# Bitcoin Provider System

The Bitcoin Provider System is a flexible and extensible way to interact with different Bitcoin-related services. It's designed to be similar to ethers.js's provider system, allowing users to use default implementations or provide their own custom implementations.

## Overview

The provider system consists of four main types of providers:

1. **Bitcoin Provider** (`IBitcoinProvider`): For core Bitcoin RPC methods
2. **Esplora Provider** (`IEsploraProvider`): For Esplora API methods
3. **Ord Provider** (`IOrdProvider`): For Ordinals and Inscriptions
4. **Alkanes Provider** (`IAlkanesProvider`): For Alkanes-specific functionality

## Default Implementation

The SDK comes with a default implementation that uses Sandshrew for Bitcoin RPC, Esplora for blockchain data, and our own servers for Ord and Alkanes.

```typescript
import { DefaultProvider } from './providers/default';

// Create a provider with a single URL
const provider = new DefaultProvider('http://localhost:3000');

// Use the provider
const blockCount = await provider.bitcoin.getBlockCount();
const utxos = await provider.esplora.getAddressUtxo(address);
```

## Creating Custom Providers

### 1. Implementing a Full Provider

You can implement the full interface for complete control:

```typescript
import { IBitcoinProvider } from './interfaces';

class CustomBitcoinProvider implements IBitcoinProvider {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async getBlockCount(): Promise<number> {
    // Your implementation
  }

  // Implement all other methods...
}
```

### 2. Extending Base Classes

For partial customization, extend the base classes:

```typescript
import { BaseEsploraProvider } from './providers/base';

class CustomEsploraProvider extends BaseEsploraProvider {
  async getAddressUtxo(address: string): Promise<EsploraUtxo[]> {
    // Override specific method
  }
}
```

### 3. Mix and Match Providers

Create a custom provider that uses different implementations for each service:

```typescript
import { IProvider } from './interfaces';
import { DefaultEsploraProvider } from './providers/default';

class CustomProvider implements IProvider {
  public bitcoin: CustomBitcoinProvider;
  public esplora: DefaultEsploraProvider;
  public ord: CustomOrdProvider;
  public alkanes: DefaultAlkanesProvider;

  constructor(bitcoinUrl: string, esploraUrl: string) {
    this.bitcoin = new CustomBitcoinProvider(bitcoinUrl);
    this.esplora = new DefaultEsploraProvider(esploraUrl);
    // ...
  }
}
```

## Provider Methods

### Bitcoin Provider (`IBitcoinProvider`)

Core Bitcoin RPC methods:
- `getBlockCount()`: Get current block height
- `getRawTransaction(txid)`: Get raw transaction data
- `getBlockHash(height)`: Get block hash by height
- `getBlock(blockhash)`: Get block data
- `getBlockHeader(blockhash)`: Get block header
- `getBlockStats(blockhash)`: Get block statistics
- `getChainTips()`: Get chain tips
- `getDifficulty()`: Get current difficulty
- `getMempoolInfo()`: Get mempool information
- `getMiningInfo()`: Get mining information
- `getNetworkInfo()`: Get network information
- `getTxOut(txid, vout)`: Get transaction output
- `getTxOutSetInfo()`: Get UTXO set information
- `verifyChain()`: Verify blockchain database

### Esplora Provider (`IEsploraProvider`)

Blockchain data methods:
- `getTxInfo(txid)`: Get transaction information
- `getTxStatus(txid)`: Get transaction status
- `getBlockTxids(hash)`: Get transaction IDs in a block
- `getTxHex(txid)`: Get transaction hex
- `getTxRaw(txid)`: Get raw transaction data
- `getTxOutspends(txid)`: Get transaction outspends
- `getAddressTx(address)`: Get address transactions
- `getAddressTxInMempool(address)`: Get address mempool transactions
- `getAddressUtxo(address)`: Get address UTXOs
- `getFeeEstimates()`: Get fee estimates

### Ord Provider (`IOrdProvider`)

Ordinals and Inscriptions methods:
- `getInscriptionById(inscriptionId)`: Get inscription by ID
- `getInscriptionContent(inscriptionId)`: Get inscription content
- `getInscriptionByNumber(number)`: Get inscription by number
- `getInscriptions(startingNumber)`: Get inscriptions
- `getInscriptionsByBlockHash(blockHash)`: Get inscriptions in block
- `getInscriptionsByBlockHeight(blockHeight)`: Get inscriptions at height
- `getInscriptionBySat(satNumber)`: Get inscription by sat number
- `getInscriptionBySatWithIndex(satNumber, index)`: Get inscription by sat with index
- `getInscriptionChildren(inscriptionId, page)`: Get inscription children
- `getInscriptionMetaData(inscriptionId)`: Get inscription metadata
- `getOutput(txid, vout)`: Get output data
- `getSatByNumber(number)`: Get sat by number
- `getSatByDecimal(decimal)`: Get sat by decimal
- `getSatByDegree(degree)`: Get sat by degree
- `getSatByBase26(base26)`: Get sat by base26
- `getSatByPercentage(percentage)`: Get sat by percentage
- `getRuneByName(runeName)`: Get rune by name
- `getRuneById(runeId)`: Get rune by ID
- `getRunes()`: Get all runes
- `getOrdData(address)`: Get address ordinals data

### Alkanes Provider (`IAlkanesProvider`)

Alkanes-specific methods:
- `getAlkanesByHeight(params)`: Get alkanes by block height
- `getAlkanesByAddress(params)`: Get alkanes by address
- `getAlkanesByOutpoint(params)`: Get alkanes by outpoint
- `getAlkaneById(params)`: Get alkane by ID
- `getAlkanes(params)`: Get alkanes list
- `trace(params)`: Trace alkane
- `simulate(request, decoder)`: Simulate alkane operation
- `simulatePoolInfo(request)`: Simulate pool info
- `previewRemoveLiquidity(params)`: Preview liquidity removal
- `meta(request, decoder)`: Get alkane metadata

## Data Types

The provider system uses several data types:

### Esplora Types
- `EsploraTx`: Transaction data
- `EsploraUtxo`: UTXO data

### Ord Types
- `OrdOutput`: Output data
- `OrdOutputRune`: Rune data in output

### Alkanes Types
- `Rune`: Rune data
- `Outpoint`: Outpoint data
- `AlkanesResponse`: Alkanes API response

## Usage Example

```typescript
import { DefaultProvider } from './providers/default';
import { IProvider } from './interfaces';

// Use default implementation
const defaultProvider = new DefaultProvider('http://localhost:3000');

// Create custom provider
class CustomProvider implements IProvider {
  // ... implementation
}

// Use in SDK functions
const utxos = await addressUtxos({
  address: 'bc1...',
  provider: defaultProvider
});
```

## Best Practices

1. **Error Handling**: Implement proper error handling in custom providers
2. **Caching**: Consider implementing caching for frequently accessed data
3. **Rate Limiting**: Be mindful of API rate limits
4. **Type Safety**: Use TypeScript types for better development experience
5. **Testing**: Test custom providers thoroughly
6. **Documentation**: Document any custom implementations 