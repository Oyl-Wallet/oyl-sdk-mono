# Oyl SDK Project Brief

## Project Overview

The Oyl SDK is a comprehensive Bitcoin development toolkit that provides easy-to-use functions for building and broadcasting Bitcoin transactions. It serves as a foundation for Bitcoin wallet development, offering support for various Bitcoin address types, transaction signing, and integration with Bitcoin-related protocols like BRC-20, Runes, and Alkanes.

The SDK aims to simplify Bitcoin development by abstracting complex Bitcoin operations into a clean, well-structured API. It provides both a programmatic interface for developers and a command-line interface (CLI) for direct interaction.

## Technical Context

### Programming Languages and Technologies

- **Primary Language**: TypeScript
- **Runtime Environment**: Node.js (v20+)
- **Package Manager**: pnpm (v8.15.0+)

### Frameworks and Libraries

#### Core Bitcoin Libraries
- `bitcoinjs-lib`: Core Bitcoin functionality
- `@bitcoinerlab/secp256k1`: Elliptic curve cryptography
- `@scure/btc-signer`: Bitcoin transaction signing
- `bip32`, `bip39`: Bitcoin wallet standards implementation
- `ecpair`: Key pair management

#### Bitcoin Protocol Extensions
- `@sadoprotocol/ordit-sdk`: Ordinals support
- `@magiceden-oss/runestone-lib`: Runestone library
- `alkanes`: Smart contract functionality on Bitcoin

#### Utilities
- `bignumber.js`: Precise number handling
- `commander`: CLI framework
- `dotenv`: Environment variable management
- `node-fetch`: HTTP requests

### System Architecture

The Oyl SDK is structured as a monorepo using pnpm workspaces, with the following key components:

1. **Core Bitcoin Operations** (`@oyl/sdk-core`)
   - Account management (HD wallet generation, key derivation)
   - Transaction creation and signing
   - UTXO management

2. **Protocol Extensions**
   - BRC-20 token support (`@oyl/sdk-brc20`)
   - Runes protocol integration (`@oyl/sdk-runes`)
   - Alkanes smart contract functionality (`@oyl/sdk-alkanes`)
   - Collectibles (NFT-like assets) handling (`@oyl/sdk-collectible`)

3. **Provider System**
   - Abstraction layer for Bitcoin network interaction
   - Support for multiple RPC endpoints (Esplora, Ord, Sandshrew, Alkanes)

4. **Command-Line Interface**
   - Interactive tools for all SDK functionality
   - Development and testing utilities

### Design Patterns

- **Factory Pattern**: Used for creating Bitcoin accounts and wallets
- **Singleton Pattern**: Used for provider instances
- **Builder Pattern**: Used for transaction construction
- **Strategy Pattern**: Used for different signing approaches

## Package Structure

### Core Package (`@oyl/sdk-core`)

#### Account Module
- Handles wallet generation from mnemonics
- Supports multiple address types (Legacy, SegWit, Taproot)
- Implements BIP32/39/44 standards for hierarchical deterministic wallets
- Key functionality: Account creation, address derivation, key management

#### Signer Module
- Manages transaction signing for different address types
- Supports various signature hash types
- Provides message signing capabilities
- Key functionality: Transaction signing, message signing, key tweaking

#### BTC Module
- Core Bitcoin transaction functionality
- Fee calculation and management
- Transaction creation and broadcasting
- Key functionality: PSBT creation, fee estimation, transaction building

#### UTXO Module
- UTXO selection and management
- Balance calculation
- UTXO filtering and sorting
- Key functionality: UTXO gathering, balance checking, coin selection

### Protocol Extension Packages

#### BRC20 Package (`@oyl/sdk-brc20`)
- BRC-20 token transfer functionality
- Token balance checking
- Integration with Ordinals for token operations
- Key functionality: Token transfers, balance queries

#### Rune Package (`@oyl/sdk-runes`)
- Rune protocol implementation
- Minting, sending, and managing Runes
- Etch operations (commit/reveal pattern)
- Key functionality: Rune minting, transfers, etching

#### Alkanes Package (`@oyl/sdk-alkanes`)
- Smart contract functionality on Bitcoin
- Contract deployment and execution
- Token operations within the Alkanes ecosystem
- Key functionality: Contract deployment, execution, token management

#### Collectible Package (`@oyl/sdk-collectible`)
- NFT-like asset management
- Transfer and ownership operations
- Key functionality: Collectible transfers, ownership verification

### Infrastructure

#### Provider Module
- Network communication abstraction
- Support for multiple Bitcoin RPC endpoints
- Transaction broadcasting and confirmation tracking
- Key functionality: Network interaction, transaction broadcasting

#### RPC Client Module
- Implementation of various RPC clients:
  - Sandshrew: Bitcoin Core RPC wrapper
  - Esplora: Block explorer API
  - Ord: Ordinals protocol
  - Alkanes: Smart contract functionality
- Key functionality: API communication, data retrieval, command execution

## Monorepo Structure

```
oyl-sdk-mono/
├── node_modules/           # Root dependencies and workspace symlinks
├── packages/
│   ├── core/              # Core functionality
│   │   ├── node_modules/  # Package-specific dependencies
│   │   ├── dist/         # Built files
│   │   └── src/          # Source files
│   ├── brc20/            # BRC-20 implementation
│   ├── runes/            # Runes implementation
│   ├── alkanes/          # Alkanes implementation
│   └── btc/              # BTC implementation
├── package.json          # Root package.json
└── pnpm-workspace.yaml   # Workspace configuration
```

## Usage Examples

### Programmatic Usage
```typescript
import { Account, Provider, btc } from '@oyl/sdk-core';

// Initialize provider
const provider = new Provider({
  url: 'https://api.example.com',
  projectId: 'your-project-id',
  network: bitcoin.networks.bitcoin,
  networkType: 'mainnet'
});

// Create account from mnemonic
const account = Account.fromMnemonic({
  mnemonic: 'your mnemonic phrase here',
  network: bitcoin.networks.bitcoin
});

// Send Bitcoin
const result = await btc.createPsbt({
  utxos: accountUtxos,
  toAddress: 'recipient-address',
  amount: 10000, // in satoshis
  feeRate: 5,
  account,
  provider
});
```

### Package Installation
```json
{
  "dependencies": {
    "@oyl/sdk-core": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/core/dist",
    "@oyl/sdk-brc20": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/brc20/dist"
  }
}
```

### Development Workflow
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @oyl/sdk-core build

# Run tests
pnpm test
``` 