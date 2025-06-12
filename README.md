[![npm version](https://badge.fury.io/js/%40oyl%2Fsdk.svg)](https://www.npmjs.com/package/@oyl/sdk)

# Oyl SDK Monorepo

This is a monorepo containing the Oyl SDK packages. The SDK provides tools for interacting with various Bitcoin protocols including BRC-20, Runes, and Alkanes.

## Packages

- `@oyl/sdk-core` - Core functionality including account management and provider interfaces
- `@oyl/sdk-alkanes` - Alkanes protocol implementation
- `@oyl/sdk-brc20` - BRC-20 protocol implementation
- `@oyl/sdk-btc` - BTC implementation
- `@oyl/sdk-runes` - Runes protocol implementation

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.15.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build a specific package
pnpm --filter @oyl/sdk-core build
```

### Tests

Run tests in watch mode
```bash
pnpm test --watch
```

Run a specific test:
```bash
pnpm test -- src/utxo/utxo.test.ts
```

## Installation

To install and set up the library, run:

```sh
$ git clone https://github.com/oyl-wallet/oyl-sdk.git
$ cd oyl-sdk
$ pnpm install
```

### Installing Packages from the Monorepo

If you want to use specific packages from this monorepo in your project, you can install them directly from GitHub. Add the following to your project's `package.json`:

```json
{
  "dependencies": {
    "@oyl/sdk-core": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/core",
    "@oyl/sdk-brc20": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/brc20"
  }
}
```

Note: 
- Replace `main` with your desired branch name (e.g., `develop`)
- The `:packages/core` syntax is important for monorepo packages
- Make sure to run `npm install` or your preferred package manager's install command after adding these dependencies

### Setting up the CLI Globally

To use the CLI globally with pnpm:

1. First, ensure pnpm is set up for global installations:
```bash
# Set up pnpm global bin directory
pnpm setup

# Add pnpm global bin to your PATH (add this to your ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/pnpm:$PATH"
```

2. Install the CLI globally:
```bash
# Navigate to the CLI package
cd packages/cli

# Install globally
pnpm install -g .
```

3. Verify the installation:
```bash
oyl-mono --help
```

If you encounter any issues with the global installation, you can also run the CLI directly:
```bash
node packages/cli/dist/index.js --help
```

## Usage

### Prerequisites

- Node.js >= 20
- pnpm

### Running the tests

```sh
$ pnpm test --filter @oyl/sdk-core
```

## Documentation

Full documentation is available at https://alkanes.build/

## Contributing

1.  Fork it!
2.  Create your feature branch: `git checkout -b my-new-feature`
3.  Add your changes: `git add .`
4.  Commit your changes: `git commit -m 'Add some feature'`
5.  Push to the branch: `git push origin my-new-feature`
6.  Submit a pull request :sunglasses:

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/oyl-wallet/oyl-sdk/tags).

## Publishing to NPM

From root of oyl-sdk repo:

```sh
$ npm publish --access public
```

## Authors

- **Oyl Dynamics**

See also the list of [contributors](https://github.com/oyl-wallet/oyl-sdk/contributors) who participated in this project.

## License

[MIT License](https://github.com/Oyl-Wallet/oyl-sdk/blob/main/LICENSE)
