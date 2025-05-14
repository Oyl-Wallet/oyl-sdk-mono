# @oyl/cli

Command-line interface for interacting with Bitcoin, Ordinals, and Alkanes.

## Installation

```bash
npm install -g @oyl/cli
```

## Usage

### Basic Commands

```bash
# Show help
oyl --help

# Bitcoin commands
oyl btc <command>

# Ordinals commands
oyl ord <command>

# Alkanes commands
oyl alkane <command>

# Wallet commands
oyl wallet <command>

# UTXO commands
oyl utxo <command>
```

### Examples

#### Bitcoin

```bash
# Get block information
oyl btc get-block <hash>

# Get transaction information
oyl btc get-tx <txid>
```

#### Ordinals

```bash
# Get inscription information
oyl ord get-inscription <id>

# List inscriptions for an address
oyl ord list-inscriptions <address>
```

#### Alkanes

```bash
# Get alkane information
oyl alkane get <id>

# List alkanes for an address
oyl alkane list <address>
```

#### Wallet

```bash
# Create a new wallet
oyl wallet create

# Import a wallet
oyl wallet import <private-key>

# Get wallet balance
oyl wallet balance
```

#### UTXO Management

```bash
# List UTXOs for an address
oyl utxo list <address>

# Select UTXOs for a transaction
oyl utxo select <address> <amount>
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT 