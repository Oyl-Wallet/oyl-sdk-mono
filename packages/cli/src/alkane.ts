import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL, DEFAULT_ALKANES_URL } from './constants';

export const alkaneCommand = new Command('alkane')
  .description('Alkane token commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('-a, --alkanes <url>', 'Alkanes API URL', DEFAULT_ALKANES_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

alkaneCommand
  .command('get <id>')
  .description('Get alkane information')
  .action(async (id: string, options: any) => {
    const config: ProviderConfig = {
      bitcoin: {
        url: options.url,
        username: options.username,
        password: options.password
      },
      esplora: {
        url: options.esplora
      },
      alkanes: {
        url: options.alkanes
      }
    };

    const provider = Provider.getInstance(config);
    const alkane = await provider.alkanes.getAlkane(id);
    
    console.log('Alkane Information');
    console.log(JSON.stringify(alkane, null, 2));
  });

alkaneCommand
  .command('list <address>')
  .description('List alkanes for an address')
  .action(async (address: string, options: any) => {
    const config: ProviderConfig = {
      bitcoin: {
        url: options.url,
        username: options.username,
        password: options.password
      },
      esplora: {
        url: options.esplora
      },
      alkanes: {
        url: options.alkanes
      }
    };

    const provider = Provider.getInstance(config);
    const alkanes = await provider.alkanes.getAlkanes(address);
    
    console.log('Alkanes for address:', address);
    console.log(JSON.stringify(alkanes, null, 2));
  }); 