import { Provider } from '../provider'

export type NetworkMap = {
  alkanes: Provider
  bitcoin: Provider
  regtest: Provider
  oylnet: Provider
  oylnet2: Provider
  signet: Provider
  mainnet?: Provider
  testnet?: Provider
  main?: Provider
}
export type Network = keyof NetworkMap