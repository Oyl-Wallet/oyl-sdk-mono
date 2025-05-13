import { Command } from 'commander';
import { Provider, ProviderConfig } from './provider';
import { DEFAULT_BITCOIN_RPC_URL, DEFAULT_ESPLORA_URL } from './constants';

export const utxoCommand = new Command('utxo')
  .description('UTXO management commands')
  .option('-u, --url <url>', 'Bitcoin RPC URL', DEFAULT_BITCOIN_RPC_URL)
  .option('-e, --esplora <url>', 'Esplora API URL', DEFAULT_ESPLORA_URL)
  .option('--username <username>', 'Bitcoin RPC username')
  .option('--password <password>', 'Bitcoin RPC password');

utxoCommand
  .command('list <address>')
  .description('List UTXOs for an address')
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
    
    console.log('Address:', address);
    console.log('UTXOs:', JSON.stringify(utxos, null, 2));
  });

utxoCommand
  .command('select <address> <amount>')
  .description('Select UTXOs for a transaction')
  .action(async (address: string, amount: number, options: any) => {
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
    
    // Sort UTXOs by value in descending order
    const sortedUtxos = utxos.sort((a, b) => b.value - a.value);
    
    // Select UTXOs that cover the amount
    let selectedUtxos = [];
    let total = 0;
    
    for (const utxo of sortedUtxos) {
      selectedUtxos.push(utxo);
      total += utxo.value;
      
      if (total >= amount) {
        break;
      }
    }
    
    if (total < amount) {
      console.error('Insufficient funds');
      return;
    }
    
    console.log('Selected UTXOs:', JSON.stringify(selectedUtxos, null, 2));
    console.log('Total value:', total, 'satoshis');
  }); 