export const DEFAULT_BITCOIN_RPC_URL = 'http://localhost:8332';
export const DEFAULT_ESPLORA_URL = 'http://localhost:3000';
export const DEFAULT_ORD_URL = 'http://localhost:8080';
export const DEFAULT_ALKANES_URL = 'http://localhost:8081';

export const DEFAULT_NETWORK = 'mainnet';
export const DEFAULT_FEE_RATE = 1;

export const SUPPORTED_NETWORKS = ['mainnet', 'testnet', 'regtest'] as const;
export type Network = typeof SUPPORTED_NETWORKS[number];

export const DEFAULT_DERIVATION_PATH = "m/84'/0'/0'/0/0";

export const DEFAULT_WALLET_NAME = 'default';

export const DEFAULT_CONFIRMATIONS = 1;

export const DEFAULT_TIMEOUT = 30000; // 30 seconds

export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second 