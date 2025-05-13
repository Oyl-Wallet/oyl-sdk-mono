# @oyl/rpc-client

A flexible and modular RPC client for Bitcoin, Esplora, Ord, and Alkanes services.

## Features

- **Modular Architecture**: Mix and match different provider implementations
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Multiple Implementations**: Support for both standard and Sandshrew Esplora APIs
- **Extensible**: Easy to add custom provider implementations

## Installation

```bash
npm install @oyl/rpc-client
```

## Usage

### Default Provider

The default provider combines all implementations:

```typescript
import { DefaultProvider } from '@oyl/rpc-client';

const provider = new DefaultProvider({
  bitcoin: {
    url: 'http://localhost:8332',
    username: 'user',
    password: 'pass'
  },
  esplora: {
    url: 'http://localhost:3000'
  },
  ord: {
    url: 'http://localhost:8080'
  },
  alkanes: {
    url: 'http://localhost:8081'
  }
});

// Use the provider
const block = await provider.bitcoin.getBlock('0000000000000000000123456789abcdef');
```

### Custom Provider

Create a custom provider by implementing the interfaces:

```typescript
import { 
  IBitcoinProvider, 
  IEsploraProvider, 
  IOrdProvider, 
  IAlkanesProvider 
} from '@oyl/rpc-client';

class CustomProvider implements IBitcoinProvider, IEsploraProvider, IOrdProvider, IAlkanesProvider {
  // Implement interface methods
}
```

### Esplora Providers

Two Esplora provider implementations are available:

1. **Standard Esplora Provider**:
```typescript
import { StandardEsploraProvider } from '@oyl/rpc-client';

const esplora = new StandardEsploraProvider({
  url: 'http://localhost:3000'
});
```

2. **Sandshrew Esplora Provider**:
```typescript
import { SandshrewEsploraProvider } from '@oyl/rpc-client';

const esplora = new SandshrewEsploraProvider({
  url: 'http://localhost:3000'
});
```

## API Documentation

### Bitcoin Provider (`IBitcoinProvider`)

```typescript
interface IBitcoinProvider {
  getBlock(hash: string): Promise<Block>;
  getTransaction(txid: string): Promise<Transaction>;
  // ... other methods
}
```

### Esplora Provider (`IEsploraProvider`)

```typescript
interface IEsploraProvider {
  getAddress(address: string): Promise<Address>;
  getUtxos(address: string): Promise<Utxo[]>;
  // ... other methods
}
```

### Ord Provider (`IOrdProvider`)

```typescript
interface IOrdProvider {
  getInscription(id: string): Promise<Inscription>;
  getInscriptions(address: string): Promise<Inscription[]>;
  // ... other methods
}
```

### Alkanes Provider (`IAlkanesProvider`)

```typescript
interface IAlkanesProvider {
  getAlkane(id: string): Promise<Alkane>;
  getAlkanes(address: string): Promise<Alkane[]>;
  // ... other methods
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT 