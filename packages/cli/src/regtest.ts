import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL } from './constants';

export const regtestCommand = new Command('regtest')
  .description('Regtest network commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

regtestCommand
  .command('generate <blocks>')
  .description('Generate blocks')
  .action(async (blocks: number, options: any) => {
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
    const addresses = await provider.bitcoin.getNewAddress();
    const blockHashes = await provider.bitcoin.generateToAddress(blocks, addresses);
    
    console.log('Generated blocks:', JSON.stringify(blockHashes, null, 2));
  });

regtestCommand
  .command('get-balance')
  .description('Get regtest wallet balance')
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
    const balance = await provider.bitcoin.getBalance();
    
    console.log('Balance:', balance, 'BTC');
  }); 