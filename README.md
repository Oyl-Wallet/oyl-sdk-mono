[![npm version](https://badge.fury.io/js/%40oyl%2Fsdk.svg)](https://www.npmjs.com/package/@oyl/sdk)

# Oyl SDK Monorepo

This is a monorepo containing the Oyl SDK packages. The SDK provides tools for interacting with various Bitcoin protocols including BRC-20, Runes, and Alkanes.

## Packages

- `@oyl-sdk/core` - Core functionality including account management and provider interfaces
- `@oyl-sdk/alkanes` - Alkanes protocol implementation
- `@oyl-sdk/brc20` - BRC-20 protocol implementation
- `@oyl-sdk/btc` - BTC implementation
- `@oyl-sdk/runes` - Runes protocol implementation

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

# Run tests
pnpm test
```

### Development

```bash
# Start development mode
pnpm dev

# Run tests in watch mode
pnpm test --watch
```

## Project Structure

```
oyl-sdk/
├── packages/
│   ├── core/                    # Shared core functionality
│   │   ├── src/
│   │   │   ├── account/        # Account management
│   │   │   ├── provider/       # Provider interfaces
│   │   │   ├── utils/          # Common utilities
│   │   │   └── types/          # Shared TypeScript types
│   │   └── package.json
│   │
│   ├── brc20/                  # BRC-20 protocol implementation
│   ├── runes/                  # Runes protocol implementation
│   └── alkanes/               # Alkanes protocol implementation
│
├── examples/                   # Example applications
│   ├── brc20-dapp/            # BRC-20 example
│   ├── runes-dapp/            # Runes example
│   └── alkanes-dapp/          # Alkanes example
│
└── package.json               # Root package.json for workspace
```

## License

MIT

## Table of contents

- [Oyl SDK](#oyl-sdk)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Running the tests](#running-the-tests)
    - [Using the cli](#using-the-cli-version)
  - [Contributing](#contributing)
  - [Versioning](#versioning)
  - [Authors](#authors)
  - [License](#license)

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
    "@oyl-sdk/core": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/core",
    "@oyl-sdk/brc20": "github:Oyl-Wallet/oyl-sdk-mono#main:packages/brc20"
  }
}
```

Note: 
- Replace `main` with your desired branch name (e.g., `develop`)
- The `:packages/core` syntax is important for monorepo packages
- Make sure to run `npm install` or your preferred package manager's install command after adding these dependencies

## Usage

### Prerequisites

- Node.js >= 20
- pnpm

### Running the tests

```sh
$ yarn test
```

### Using the CLI version

```sh
$ make reset
```

This does a fresh build of the lib directory which the cli uses after all the .ts files are compiled.

The name of the bin for the cli is called "oyl". If you want to invoke it without having the yarn prefix you need to add it globally.
Run this command:

```sh
$ yarn global add oyl
```

You can also link the package so it updates as you make local changes:

```sh
$ yarn link
```

If you want the program to be isolated to only this enviornment use the local script provided to you like this:

```sh
$ yarn oyl --help
```

e.g. `oyl utxos addressUtxos -a bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx -p regtest`.
For more detailed instructions on how to use the cli, refer to the README.md found in the cli directory.

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
