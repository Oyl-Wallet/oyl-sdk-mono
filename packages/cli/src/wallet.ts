import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL } from './constants';
import { generateMnemonic, mnemonicToSeed } from 'bip39';
import { HDKey } from 'ethereumjs-wallet';

export const walletCommand = new Command('wallet')
  .description('Wallet management commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

walletCommand
  .command('create')
  .description('Create a new wallet')
  .action(async (options: any) => {
    const mnemonic = generateMnemonic();
    const seed = await mnemonicToSeed(mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    console.log('Mnemonic:', mnemonic);
    console.log('Private Key:', hdkey.privateKey.toString('hex'));
    console.log('Public Key:', hdkey.publicKey.toString('hex'));
    console.log('Address:', hdkey.getAddress().toString('hex'));
  });

walletCommand
  .command('import <privateKey>')
  .description('Import a wallet using a private key')
  .action(async (privateKey: string, options: any) => {
    const hdkey = HDKey.fromPrivateKey(Buffer.from(privateKey, 'hex'));
    
    console.log('Private Key:', hdkey.privateKey.toString('hex'));
    console.log('Public Key:', hdkey.publicKey.toString('hex'));
    console.log('Address:', hdkey.getAddress().toString('hex'));
  });

walletCommand
  .command('balance <address>')
  .description('Get wallet balance')
  .action(async (address: string, options: any) => {
    const config: ProviderConfig = {
      bitcoin: {
        url: options.url,
        username: options.username,
        password: options.password
      },
      esplora: {
        url: options.esplora
      }
    };

    const provider = Provider.getInstance(config);
    const utxos = await provider.esplora.getUtxos(address);
    const balance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    
    console.log('Address:', address);
    console.log('Balance:', balance, 'satoshis');
    console.log('UTXOs:', utxos.length);
  }); 