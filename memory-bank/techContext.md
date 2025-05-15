# Technical Context: Oyl SDK

## Technologies Used

### Programming Languages

| Language   | Version | Purpose                                      |
|------------|---------|----------------------------------------------|
| TypeScript | 4.9.5   | Primary development language                 |
| JavaScript | ES2020+ | Compiled output and some utility scripts     |

### Runtime Environment

| Environment | Version | Purpose                                      |
|------------|---------|----------------------------------------------|
| Node.js    | v20+    | Runtime for SDK and CLI                      |
| Browser    | Modern  | Support for browser-based applications (partial) |

### Package Management

| Tool       | Version   | Purpose                                    |
|------------|-----------|-------------------------------------------|
| Yarn       | 1.22.21+  | Primary package manager                    |
| NPM        | 10.x+     | Alternative package manager support        |
| pnpm       | 8.15.0+   | Workspace package manager for monorepo     |

### Monorepo Structure

The SDK is organized as a monorepo using pnpm workspaces. This structure allows for:
- Shared dependencies between packages
- Independent versioning of packages
- Simplified development workflow
- Consistent tooling across packages

#### Package Organization

```
oyl-sdk/
├── packages/
│   ├── core/                    # Core functionality
│   ├── brc20/                   # BRC-20 implementation
│   ├── runes/                   # Runes implementation
│   ├── alkanes/                 # Alkanes implementation
│   └── btc/                     # BTC implementation
```

#### Package Dependencies

Each package can depend on other packages in the monorepo using workspace references:

```json
{
  "dependencies": {
    "@oyl-sdk/core": "workspace:*",
    "@oyl-sdk/brc20": "workspace:*"
  }
}
```

#### External Package Installation

To use packages from this monorepo in external projects:

```json
{
  "dependencies": {
    "@oyl-sdk/core": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/core",
    "@oyl-sdk/brc20": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/brc20"
  }
}
```

Note:
- Replace `main` with desired branch name
- Use `:packages/package-name` syntax for monorepo packages
- Run package manager install command after adding dependencies

#### Development Workflow

1. **Local Development**:
   ```bash
   # Install all dependencies
   pnpm install
   
   # Build all packages
   pnpm build
   
   # Run tests
   pnpm test
   ```

2. **Package-Specific Commands**:
   ```bash
   # Build specific package
   pnpm --filter @oyl-sdk/core build
   
   # Test specific package
   pnpm --filter @oyl-sdk/brc20 test
   ```

3. **Adding New Packages**:
   - Create new directory in `packages/`
   - Initialize with `package.json`
   - Add to workspace in root `pnpm-workspace.yaml`

4. **Publishing**:
   - Version packages independently
   - Use `pnpm publish` in package directory
   - Ensure all dependencies are properly listed

## Core Bitcoin Libraries

| Library           | Purpose                                         |
|-------------------|-------------------------------------------------|
| bitcoinjs-lib     | Core Bitcoin functionality                      |
| @bitcoinerlab/secp256k1 | Elliptic curve cryptography              |
| @scure/btc-signer | Bitcoin transaction signing                     |
| bip32, bip39      | Bitcoin wallet standards implementation         |
| ecpair            | Key pair management                             |

## Protocol Extensions

| Library                  | Purpose                                  |
|--------------------------|------------------------------------------|
| @sadoprotocol/ordit-sdk  | Ordinals support                         |
| @magiceden-oss/runestone-lib | Runestone library for Runes protocol |
| alkanes                  | Smart contract functionality on Bitcoin  |

## Utility Libraries

| Library           | Purpose                                         |
|-------------------|-------------------------------------------------|
| bignumber.js      | Precise number handling                         |
| commander         | CLI framework                                   |
| dotenv            | Environment variable management                 |
| node-fetch        | HTTP requests                                   |
| fs-extra          | Enhanced file system operations                 |

## Development Tools

| Tool              | Purpose                                         |
|-------------------|-------------------------------------------------|
| Jest              | Testing framework                               |
| Prettier          | Code formatting                                 |
| TypeScript        | Static type checking                            |
| ts-node           | TypeScript execution environment               |
| cross-env         | Cross-platform environment variables            |

## Development Setup

### Prerequisites

- Node.js v20 or higher
- Yarn 1.22.21 or higher
- Git

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/oyl-wallet/oyl-sdk.git
   cd oyl-sdk
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the project:
   ```bash
   yarn build
   ```

4. (Optional) Link for local development:
   ```bash
   yarn link
   ```

### Development Workflow

1. **Code Modification**:
   - Make changes to TypeScript files in the `src/` directory

2. **Building**:
   - Run `yarn build` to compile TypeScript to JavaScript
   - Output is generated in the `lib/` directory

3. **Development Mode**:
   - Run `yarn dev` for watch mode that recompiles on changes

4. **Testing**:
   - Run `yarn test` to execute Jest tests
   - Tests are located in `src/__tests__/` directory

5. **CLI Testing**:
   - Run `yarn oyl <command>` to test CLI functionality
   - Or use `make reset` to rebuild and prepare for CLI testing

6. **Code Formatting**:
   - Run `yarn prettier` to format code according to project standards

### Environment Configuration

The SDK uses environment variables for configuration, which can be set in a `.env` file:

```
# Network configuration
NETWORK=mainnet  # Options: mainnet, testnet, regtest
API_URL=https://api.example.com
PROJECT_ID=your-project-id

# Optional configurations
FEE_RATE=5  # Default fee rate in sat/vB
```

## Technical Constraints

### Bitcoin Network Constraints

1. **Transaction Size Limits**:
   - Standard transactions limited to 100KB
   - Non-standard transactions may have different limits depending on network nodes

2. **Fee Considerations**:
   - Minimum relay fee requirements (currently 1 sat/vB on most nodes)
   - Fee market fluctuations affecting confirmation times

3. **Network Latency**:
   - Block time variability (approximately 10 minutes on average)
   - Confirmation requirements for security

### Protocol-Specific Constraints

1. **BRC-20**:
   - Ordinals-based token standard with specific inscription requirements
   - Two-step process (mint/inscribe then transfer)
   - Limited throughput due to inscription size

2. **Runes**:
   - Runestone format requirements
   - Etching and transfer rules
   - Divisibility constraints

3. **Alkanes**:
   - Smart contract execution limitations
   - Gas-like constraints for contract execution
   - Protocol-specific transaction formats

### Implementation Constraints

1. **Browser Compatibility**:
   - Limited browser support due to cryptographic library dependencies
   - Some features may require Node.js environment

2. **Key Management**:
   - Secure key storage not provided directly by the SDK
   - Integration with secure storage solutions required for production use

3. **RPC Endpoint Requirements**:
   - Requires access to Bitcoin RPC endpoints
   - Some functionality requires specific RPC methods to be available

## Dependencies

### Core Dependencies

```json
{
  "@bitcoinerlab/secp256k1": "1.0.2",
  "@magiceden-oss/runestone-lib": "1.0.2",
  "@sadoprotocol/ordit-sdk": "3.0.0",
  "@scure/btc-signer": "1.5.0",
  "alkanes": "git+https://github.com/kungfuflex/alkanes.git",
  "bignumber.js": "9.1.2",
  "bip32": "4.0.0",
  "bip322-js": "2.0.0",
  "bip39": "3.1.0",
  "bitcoin-address-validation": "2.2.3",
  "bitcoinjs-lib": "6.1.7",
  "cbor-x": "1.6.0",
  "change-case": "4.1.2",
  "commander": "12.1.0",
  "crypto": "1.0.1",
  "dotenv": "16.3.1",
  "ecpair": "2.1.0",
  "fs-extra": "11.2.0",
  "nice-repl": "0.1.2",
  "node-fetch": "2.7.0"
}
```

### Development Dependencies

```json
{
  "@types/jest": "29.5.14",
  "@types/node": "20.17.12",
  "@types/tiny-async-pool": "2.0.3",
  "@types/yargs": "17.0.33",
  "cross-env": "^7.0.3",
  "jest": "29.7.0",
  "npm-run-all": "^4.1.5",
  "ts-jest": "29.2.5",
  "typescript": "4.9.5",
  "yarn-audit-fix": "10.1.1"
}
```

### Dependency Management Strategy

1. **Version Pinning**:
   - All dependencies have specific versions pinned
   - Reduces risk of unexpected breaking changes

2. **Security Auditing**:
   - Regular security audits with `yarn audit`
   - Security fixes applied promptly

3. **Dependency Updates**:
   - Regular updates of non-breaking dependencies
   - Major version updates evaluated carefully for breaking changes

4. **Custom Forks**:
   - Some dependencies (like alkanes) use specific Git repositories
   - Ensures compatibility with SDK requirements

## Build and Compilation

### TypeScript Configuration

The project uses TypeScript with the following key configuration options:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./lib",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "**/__tests__/*"]
}
```

### Build Process

1. TypeScript compilation:
   ```bash
   tsc
   ```

2. Output structure:
   - JavaScript files in `lib/` directory
   - Type definitions (`.d.ts` files) for TypeScript consumers
   - Source maps for debugging

3. Distribution:
   - Published as NPM package `@oyl/sdk`
   - Includes compiled JavaScript, type definitions, and essential files

## Deployment and Distribution

### NPM Package

The SDK is distributed as an NPM package with the following characteristics:

- **Package Name**: `@oyl/sdk`
- **Version Scheme**: Semantic Versioning (SemVer)
- **License**: MIT
- **Entry Point**: `lib/index.js`
- **Types**: `lib/index.d.ts`

### Binary Distribution

The CLI component is distributed as executable binaries:

- **Binary Names**:
  - `oyl`: Main CLI tool
  - `oyl-cli`: Alternative CLI entry point

### Installation Methods

1. **NPM Installation**:
   ```bash
   npm install @oyl/sdk
   ```

2. **Yarn Installation**:
   ```bash
   yarn add @oyl/sdk
   ```

3. **Global CLI Installation**:
   ```bash
   npm install -g @oyl/sdk
   # or
   yarn global add @oyl/sdk
   ```

## Integration Notes

### Bitcoin Node Requirements

- **Direct Node Access**: Optional but recommended for full functionality
- **API Access**: Required for blockchain data and transaction broadcasting
- **Supported Node Types**:
  - Bitcoin Core
  - Compatible alternatives with standard RPC interface

### Network Support

- **Mainnet**: Full support for Bitcoin mainnet
- **Testnet**: Full support for Bitcoin testnet
- **Regtest**: Full support for local regtest environment
- **Signet**: Support for Bitcoin signet

### API Requirements

- **Esplora API**: For blockchain data access
- **Ord API**: For Ordinals protocol interaction
- **Alkanes API**: For smart contract functionality

### Security Considerations

- **Key Management**: Secure storage of private keys required
- **Transaction Signing**: Can be performed offline for enhanced security
- **Input Validation**: Thorough validation of all inputs recommended
- **Error Handling**: Proper error handling required for security-critical operations