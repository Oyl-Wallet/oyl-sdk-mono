import '@types/jest'
import { networks } from 'bitcoinjs-lib'
import { Provider } from './index'
import * as dotenv from 'dotenv'

dotenv.config()

describe('Provider', () => {
  it('should initialize with correct network settings', () => {
    const provider = new Provider({
      url: 'https://testnet.sandshrew.io',
      projectId: 'test-project',
      network: networks.testnet,
      networkType: 'testnet',
    })

    expect(provider.network).toBe(networks.testnet)
    expect(provider.networkType).toBe('testnet')
    expect(provider.url).toBe('https://testnet.sandshrew.io/v1/test-project')
  })

  it('should initialize with custom version', () => {
    const provider = new Provider({
      url: 'https://testnet.sandshrew.io',
      projectId: 'test-project',
      network: networks.testnet,
      networkType: 'testnet',
      version: 'v2',
    })

    expect(provider.url).toBe('https://testnet.sandshrew.io/v2/test-project')
  })

  it('should initialize with regtest network', () => {
    const provider = new Provider({
      url: 'http://localhost:18888',
      projectId: 'regtest',
      network: networks.regtest,
      networkType: 'regtest',
    })

    expect(provider.network).toBe(networks.regtest)
    expect(provider.networkType).toBe('regtest')
  })

  it('should initialize with mainnet network', () => {
    const provider = new Provider({
      url: 'https://mainnet.sandshrew.io',
      projectId: 'main-project',
      network: networks.bitcoin,
      networkType: 'mainnet',
    })

    expect(provider.network).toBe(networks.bitcoin)
    expect(provider.networkType).toBe('mainnet')
  })
}) 