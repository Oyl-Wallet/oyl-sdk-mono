#!/usr/bin/env node

import { Command } from 'commander';
import { btcCommand } from './btc';
import { ordCommand } from './ord';
import { alkaneCommand } from './alkane';
import { walletCommand } from './wallet';
import { utxoCommand } from './utxo';
import { regtestCommand } from './regtest';
import { brc20Command } from './brc20';
import { collectibleCommand } from './collectible';
import { runeCommand } from './rune';
import { accountCommand } from './account';

const program = new Command();

program
  .name('oyl')
  .description('CLI for interacting with Bitcoin, Ordinals, and Alkanes')
  .version('0.1.0');

// Add subcommands
program.addCommand(btcCommand);
program.addCommand(ordCommand);
program.addCommand(alkaneCommand);
program.addCommand(walletCommand);
program.addCommand(utxoCommand);
program.addCommand(regtestCommand);
program.addCommand(brc20Command);
program.addCommand(collectibleCommand);
program.addCommand(runeCommand);
program.addCommand(accountCommand);

program.parse(); 