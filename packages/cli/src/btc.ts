import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL } from './constants';

export const btcCommand = new Command('btc')
  .description('Bitcoin-related commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

btcCommand
  .command('get-block <hash>')
  .description('Get block information')
  .action(async (hash: string, options: any) => {
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
    const block = await provider.bitcoin.getBlock(hash);
    console.log(JSON.stringify(block, null, 2));
  });

btcCommand
  .command('get-tx <txid>')
  .description('Get transaction information')
  .action(async (txid: string, options: any) => {
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
    const tx = await provider.bitcoin.getTransaction(txid);
    console.log(JSON.stringify(tx, null, 2));
  }); 