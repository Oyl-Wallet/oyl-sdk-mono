import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL } from './constants';

export const accountCommand = new Command('account')
  .description('Account management commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

accountCommand
  .command('create')
  .description('Create a new account')
  .action(async (options: any) => {
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
    const address = await provider.bitcoin.getNewAddress();
    
    console.log('New account created');
    console.log('Address:', address);
  });

accountCommand
  .command('info <address>')
  .description('Get account information')
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
    
    console.log('Account Information');
    console.log('Address:', address);
    console.log('Balance:', balance, 'satoshis');
    console.log('UTXOs:', utxos.length);
  }); 