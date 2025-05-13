import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL, DEFAULT_ORD_URL } from './constants';

export const ordCommand = new Command('ord')
  .description('Ordinals commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('-o, --ord <url>', 'Ord API URL', DEFAULT_ORD_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

ordCommand
  .command('get-inscription <id>')
  .description('Get inscription information')
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
      ord: {
        url: options.ord
      }
    };

    const provider = Provider.getInstance(config);
    const inscription = await provider.ord.getInscription(id);
    
    console.log('Inscription Information');
    console.log(JSON.stringify(inscription, null, 2));
  });

ordCommand
  .command('list-inscriptions <address>')
  .description('List inscriptions for an address')
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
      ord: {
        url: options.ord
      }
    };

    const provider = Provider.getInstance(config);
    const inscriptions = await provider.ord.getInscriptions(address);
    
    console.log('Inscriptions for address:', address);
    console.log(JSON.stringify(inscriptions, null, 2));
  }); 