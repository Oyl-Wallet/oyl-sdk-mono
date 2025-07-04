import { Provider } from '../provider'
import { 
  Account,
  AddressKey,
  SpendStrategy,
  AlkanesByAddressResponse,
  AlkanesOutpoint,
  OrdOutput,
  EsploraUtxo,
  AddressType
} from '../types'
import { OylTransactionError } from '../shared/errors'
import { 
  getAddressKey,
  getAddressType,
} from '../account'
import asyncPool from 'tiny-async-pool'
import { toTxId } from '../shared/utils'
import {
  AlkanesUtxoEntry,
  AddressUtxoPortfolio,
  FormattedUtxo,
  AccountUtxoPortfolio,
  GatheredUtxos,
} from '../types/utxo'
import { minimumFee } from '../shared'
import { UTXO_ASSET_SAT_THRESHOLD } from '../shared/constants'

export const accountBalance = async ({
  account,
  provider,
}: {
  account: Account
  provider: Provider
}) => {
  let confirmedAmount: number = 0
  let pendingAmount: number = 0
  let amount: number = 0

  for (let i = 0; i < account.spendStrategy.addressOrder.length; i++) {
    const address = account[account.spendStrategy.addressOrder[i]].address
    const { chain_stats, mempool_stats } = await provider.esplora._call(
      'esplora_address',
      [address]
    )

    const btcBalance = chain_stats.funded_txo_sum - chain_stats.spent_txo_sum
    const pendingBtcBalance =
      mempool_stats.funded_txo_sum - mempool_stats.spent_txo_sum

    confirmedAmount += btcBalance
    pendingAmount += pendingBtcBalance
    amount += btcBalance + pendingAmount
  }
  return {
    confirmedAmount: Math.floor(confirmedAmount / 10 ** 8),
    pendingAmount: Math.floor(pendingAmount / 10 ** 8),
    amount: Math.floor(amount / 10 ** 8),
  }
}

export const addressBalance = async ({
  address,
  provider,
}: {
  address: string
  provider: Provider
}) => {
  let confirmedAmount: number = 0
  let pendingAmount: number = 0
  let amount: number = 0

  const { chain_stats, mempool_stats } = await provider.esplora._call(
    'esplora_address',
    [address]
  )

  const btcBalance = chain_stats.funded_txo_sum - chain_stats.spent_txo_sum
  const pendingBtcBalance =
    mempool_stats.funded_txo_sum - mempool_stats.spent_txo_sum

  confirmedAmount += btcBalance
  pendingAmount += pendingBtcBalance
  amount += btcBalance + pendingAmount

  return {
    confirmedAmount: confirmedAmount / 10 ** 8,
    pendingAmount: pendingAmount / 10 ** 8,
    amount: amount / 10 ** 8,
  }
}

const mapAlkanesById = (
  outpoints: AlkanesOutpoint[]
): Record<string, AlkanesUtxoEntry> => {
  const toBigInt = (hex: string) => BigInt(hex)
  return outpoints
    .flatMap(({ runes }) => runes)
    .reduce<Record<string, AlkanesUtxoEntry>>((acc, { rune, balance }) => {
      const key = `${toBigInt(rune.id.block)}:${toBigInt(rune.id.tx)}`
      const previous = acc[key]?.value ? BigInt(acc[key].value) : 0n
      acc[key] = {
        value: (previous + toBigInt(balance)).toString(),
        name: rune.name,
        symbol: rune.symbol,
      }

      return acc
    }, {})
}

export const addressUtxos = async ({
  address,
  provider,
  spendStrategy,
}: {
  address: string
  provider: Provider
  spendStrategy?: SpendStrategy
}): Promise<AddressUtxoPortfolio> => {
  let spendableTotalBalance: number = 0
  let pendingTotalBalance: number = 0
  let totalBalance: number = 0
  const utxos: FormattedUtxo[] = []
  const spendableUtxos: FormattedUtxo[] = []
  const pendingUtxos: FormattedUtxo[] = []
  const ordUtxos: FormattedUtxo[] = []
  const runeUtxos: FormattedUtxo[] = []
  const alkaneUtxos: FormattedUtxo[] = []

  const multiCall = await provider.sandshrew.multiCall([
    ['esplora_address::utxo', [address]],
    ['btc_getblockcount', []],
    [
      'alkanes_protorunesbyaddress',
      [
        {
          address,
          protocolTag: '1',
        },
      ],
    ],
  ])

  const esploraUtxos = multiCall[0].result as EsploraUtxo[]
  const blockCount = multiCall[1].result
  const alkanesByAddress = multiCall[2].result as AlkanesByAddressResponse

  if (esploraUtxos.length === 0) {
    return {
      utxos,
      alkaneUtxos,
      spendableTotalBalance,
      spendableUtxos,
      runeUtxos,
      ordUtxos,
      pendingUtxos,
      pendingTotalBalance,
      totalBalance,
    }
  }

  alkanesByAddress.outpoints.forEach((alkane) => {
    alkane.outpoint.txid = toTxId(alkane.outpoint.txid)
  })

  const concurrencyLimit = 50
  const processedUtxos: {
    utxo: EsploraUtxo
    txOutput: OrdOutput
    scriptPk: string
    alkanesOutpoints: AlkanesOutpoint[]
  }[] = []

  const processUtxo = async (utxo: EsploraUtxo) => {
    try {
      const txIdVout = `${utxo.txid}:${utxo.vout}`

      const multiCall = await provider.sandshrew.multiCall([
        ['ord_output', [txIdVout]],
        ['esplora_tx', [utxo.txid]],
      ])

      const txOutput = multiCall[0].result as OrdOutput
      const txDetails = multiCall[1].result

      const alkanesOutpoints = alkanesByAddress.outpoints.filter(
        ({ outpoint }) =>
          outpoint.txid === utxo.txid && outpoint.vout === utxo.vout
      )

      return {
        utxo,
        txOutput,
        scriptPk: txDetails.vout[utxo.vout].scriptpubkey,
        alkanesOutpoints,
      }
    } catch (error) {
      console.error(`Error processing UTXO ${utxo.txid}:${utxo.vout}`, error)
      throw error
    }
  }

  for await (const result of asyncPool(
    concurrencyLimit,
    esploraUtxos,
    processUtxo
  )) {
    if (result !== null) {
      processedUtxos.push(result)
    }
  }

  const utxoSortGreatestToLeast = spendStrategy?.utxoSortGreatestToLeast ?? true

  processedUtxos.sort((a, b) =>
    utxoSortGreatestToLeast
      ? b.utxo.value - a.utxo.value
      : a.utxo.value - b.utxo.value
  )

  for (const { utxo, txOutput, scriptPk, alkanesOutpoints } of processedUtxos) {
    const hasInscriptions = txOutput.inscriptions.length > 0
    const hasRunes = Object.keys(txOutput.runes).length > 0
    const hasAlkanes = alkanesOutpoints.length > 0
    const confirmations = blockCount - (utxo.status?.block_height ?? 0)
    const indexed = txOutput.indexed
    const inscriptions = txOutput.inscriptions
    const runes = Array.isArray(txOutput.runes) ? {} : txOutput.runes
    const alkanes = mapAlkanesById(alkanesOutpoints)

    totalBalance += utxo.value
    utxos.push({
      txId: utxo.txid,
      outputIndex: utxo.vout,
      satoshis: utxo.value,
      address,
      inscriptions,
      runes,
      alkanes,
      confirmations,
      indexed,
      scriptPk,
    })

    if (txOutput.indexed) {
      if (!utxo.status.confirmed) {
        pendingUtxos.push({
          txId: utxo.txid,
          outputIndex: utxo.vout,
          satoshis: utxo.value,
          address,
          inscriptions,
          runes,
          alkanes,
          confirmations,
          indexed,
          scriptPk,
        })
        pendingTotalBalance += utxo.value
        continue
      }

      if (hasAlkanes) {
        alkaneUtxos.push({
          txId: utxo.txid,
          outputIndex: utxo.vout,
          satoshis: utxo.value,
          address,
          inscriptions,
          runes,
          alkanes,
          confirmations,
          indexed,
          scriptPk,
        })
      }

      if (hasRunes) {
        runeUtxos.push({
          txId: utxo.txid,
          outputIndex: utxo.vout,
          satoshis: utxo.value,
          address,
          inscriptions,
          runes,
          alkanes,
          confirmations,
          indexed,
          scriptPk,
        })
      }
      if (hasInscriptions) {
        ordUtxos.push({
          txId: utxo.txid,
          outputIndex: utxo.vout,
          satoshis: utxo.value,
          address,
          inscriptions,
          runes,
          alkanes,
          confirmations,
          indexed,
          scriptPk,
        })
      }
      if (
        !hasInscriptions &&
        !hasRunes &&
        !hasAlkanes &&
        utxo.value !== 546 &&
        utxo.value !== 330
      ) {
        spendableUtxos.push({
          txId: utxo.txid,
          outputIndex: utxo.vout,
          satoshis: utxo.value,
          address,
          inscriptions,
          runes,
          alkanes,
          confirmations,
          indexed,
          scriptPk,
        })
        spendableTotalBalance += utxo.value
        continue
      }
    }
  }

  return {
    utxos,
    alkaneUtxos,
    spendableTotalBalance,
    spendableUtxos,
    runeUtxos,
    ordUtxos,
    pendingUtxos,
    pendingTotalBalance,
    totalBalance,
  }
}

export const accountUtxos = async ({
  account,
  provider,
}: {
  account: Account
  provider: Provider
}): Promise<AccountUtxoPortfolio> => {
  const accountUtxos: FormattedUtxo[] = []
  const accountSpendableTotalUtxos = []
  let accountSpendableTotalBalance = 0
  let accountPendingTotalBalance = 0
  let accountTotalBalance = 0
  const accounts = {} as Record<AddressKey, AddressUtxoPortfolio>
  const addresses = [
    { addressKey: 'nativeSegwit', address: account.nativeSegwit.address },
    { addressKey: 'nestedSegwit', address: account.nestedSegwit.address },
    { addressKey: 'taproot', address: account.taproot.address },
    { addressKey: 'legacy', address: account.legacy.address },
  ]
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i].address
    const addressKey = addresses[i].addressKey
    const {
      utxos,
      alkaneUtxos,
      spendableTotalBalance,
      spendableUtxos,
      runeUtxos,
      ordUtxos,
      pendingUtxos,
      pendingTotalBalance,
      totalBalance,
    } = await addressUtxos({
      address,
      provider,
    })

    accountSpendableTotalBalance += spendableTotalBalance
    accountSpendableTotalUtxos.push(...spendableUtxos)
    accountPendingTotalBalance += pendingTotalBalance
    accountUtxos.push(...utxos)
    accountTotalBalance += totalBalance

    accounts[addressKey as AddressKey] = {
      utxos,
      alkaneUtxos,
      spendableTotalBalance,
      spendableUtxos,
      runeUtxos,
      ordUtxos,
      pendingUtxos,
      pendingTotalBalance,
      totalBalance,
    }
  }
  return {
    accountUtxos,
    accountTotalBalance,
    accountSpendableTotalUtxos,
    accountSpendableTotalBalance,
    accountPendingTotalBalance,
    accounts,
  }
}

export const selectUtxos = (
  utxos: FormattedUtxo[],
  spendStrategy: SpendStrategy
) => {
  const addressMap = new Map<string, FormattedUtxo[]>()

  utxos.forEach((utxo) => {
    const addressKey = getAddressKey(utxo.address)
    if (addressKey && spendStrategy.addressOrder.includes(addressKey)) {
      if (!addressMap.has(addressKey)) {
        addressMap.set(addressKey, [])
      }
      addressMap.get(addressKey)!.push(utxo)
    }
  })

  return spendStrategy.addressOrder.flatMap((addressKey) => {
    const utxosForAddress = addressMap.get(addressKey) || []
    return utxosForAddress.sort(
      (a, b) =>
        (spendStrategy.utxoSortGreatestToLeast ? b.satoshis : a.satoshis) -
        (spendStrategy.utxoSortGreatestToLeast ? a.satoshis : b.satoshis)
    )
  })
}

export const selectSpendableUtxos = (
  utxos: FormattedUtxo[],
  spendStrategy: SpendStrategy
): GatheredUtxos => {
  const paymentUtxos = utxos.filter(
    (u) =>
      u.indexed &&
      u.inscriptions.length <= 0 &&
      Object.keys(u.runes).length <= 0 &&
      Object.keys(u.alkanes).length <= 0 &&
      u.satoshis !== 546 &&
      u.satoshis !== 330
  )

  const buckets = new Map<string, FormattedUtxo[]>()

  for (const u of paymentUtxos) {
    const key = getAddressKey(u.address)
    if (!key || !spendStrategy.addressOrder.includes(key)) continue
    ;(buckets.get(key) ?? buckets.set(key, []).get(key)!).push(u)
  }

  const orderedUtxos = spendStrategy.addressOrder.flatMap((key) => {
    const list = buckets.get(key) ?? []
    return list.sort((a, b) =>
      spendStrategy.utxoSortGreatestToLeast
        ? b.satoshis - a.satoshis
        : a.satoshis - b.satoshis
    )
  })

  const totalAmount = orderedUtxos.reduce(
    (sum, { satoshis }) => sum + satoshis,
    0
  )

  return { utxos: orderedUtxos, totalAmount }
}

export const selectAlkanesUtxos = ({
  utxos,
  greatestToLeast,
  alkaneId,
  targetNumberOfAlkanes,
}: {
  utxos: FormattedUtxo[]
  greatestToLeast: boolean
  alkaneId: { block: string; tx: string }
  targetNumberOfAlkanes: number
}) => {
  const idKey = `${alkaneId.block}:${alkaneId.tx}`
  const withBalance = utxos.map((u) => ({
    utxo: u,
    balance: Number(u.alkanes[idKey]?.value),
  }))

  withBalance.sort((a, b) =>
    greatestToLeast ? b.balance - a.balance : a.balance - b.balance
  )

  let totalAmount = 0
  let totalBalance = 0
  const alkanesUtxos: FormattedUtxo[] = []

  for (const { utxo, balance } of withBalance) {
    if (totalBalance >= targetNumberOfAlkanes) break
    if (balance > 0) {
      alkanesUtxos.push(utxo)
      totalAmount += utxo.satoshis
      totalBalance += balance
    }
  }

  if (totalBalance < targetNumberOfAlkanes) {
    throw new OylTransactionError(new Error('Insufficient balance of alkanes.'))
  }

  return { utxos: alkanesUtxos, totalAmount, totalBalance }
}

export const filterUtxoMetaprotocol = async ({
  utxo,
  address,
  provider
}: {
  utxo: EsploraUtxo
  address: string
  provider: Provider
}): Promise<{ formattedUtxo: FormattedUtxo, isValid: boolean }> => {

  const txIdVout = `${utxo.txid}:${utxo.vout}`

  const multiCall = await provider.sandshrew.multiCall([
    ['btc_getblockcount', []],
    ['ord_output', [txIdVout]],
    ['esplora_tx', [utxo.txid]],
    ['alkanes_protorunesbyaddress',
      [
        {
          address,
          protocolTag: '1',
        },
      ],
    ],
  ])

  const blockCount = multiCall[0].result
  const txOutput = multiCall[1].result as OrdOutput
  const txDetails = multiCall[2].result
  const alkanesByAddress = multiCall[3].result as AlkanesByAddressResponse

  alkanesByAddress.outpoints.forEach((alkane) => {
    alkane.outpoint.txid = toTxId(alkane.outpoint.txid)
  })

  const alkanesOutpoints = alkanesByAddress.outpoints.filter(
    ({ outpoint }) =>
      outpoint.txid === utxo.txid && outpoint.vout === utxo.vout
  )

  const hasInscriptions = txOutput.inscriptions.length > 0
  const hasRunes = Object.keys(txOutput.runes).length > 0
  const hasAlkanes = alkanesOutpoints.length > 0
  const confirmations = blockCount - (utxo.status?.block_height ?? 0)
  const indexed = txOutput.indexed
  const inscriptions = txOutput.inscriptions
  const runes = Array.isArray(txOutput.runes) ? {} : txOutput.runes
  const alkanes = mapAlkanesById(alkanesOutpoints)
  const scriptPk = txDetails.vout[utxo.vout].scriptpubkey

  const formattedUtxo = {
    txId: utxo.txid,
    outputIndex: utxo.vout,
    satoshis: utxo.value,
    address,
    inscriptions,
    runes,
    alkanes,
    confirmations,
    indexed,
    scriptPk,
  }

  const isValid = !hasInscriptions && !hasRunes && !hasAlkanes

  return { formattedUtxo, isValid }
}

export async function getAddressSpendableUtxoSet({
  address,
  amount,
  estimatedFee,
  satThreshold = UTXO_ASSET_SAT_THRESHOLD,
  sortUtxosGreatestToLeast = true,
  provider,
  allowPartial = false,
}: {
  address: string
  amount: number
  estimatedFee?: number
  satThreshold?: number
  sortUtxosGreatestToLeast?: boolean
  provider: Provider
  allowPartial?: boolean
}): Promise<{ utxos: FormattedUtxo[], totalAmount: number, hasEnough: boolean }> {
  amount = Number(amount);
  const addressType = getAddressType(address);

  if (!addressType) {
    throw new Error('Invalid address');
  }

  const addressUtxos = (await provider.esplora.getAddressUtxo(address)) || [];

  const minFee = estimatedFee ?? minimumFee({
    taprootInputCount: addressType === AddressType.P2TR ? 2 : 0,
    nonTaprootInputCount: addressType === AddressType.P2TR ? 0 : 2,
    outputCount: 3,
  });

  // confirm sum of utxos is greater than amount
  const totalSatoshis = addressUtxos.reduce((sum, u) => sum + u.value, 0);
  if (totalSatoshis < amount + minFee && !allowPartial) {
    throw new Error('Insufficient balance of utxos to cover spend amount and fee.');
  }

  // sort addressUtxos by satoshis according to spendStrategy
  const sortedUtxos = addressUtxos.sort((a, b) =>
    sortUtxosGreatestToLeast ? b.value - a.value : a.value - b.value
  );

  // filter out utxos that are not indexed
  const indexedUtxos = sortedUtxos.filter((u) => u.status.confirmed);

  // filter out utxos that are not above the satThreshold
  const spendableUtxos = indexedUtxos.filter((u) => u.value > satThreshold);

  let totalAmount = 0;
  const selectedUtxos: FormattedUtxo[] = [];
  const CHUNK_SIZE = 3;

  // Process UTXOs in chunks of 3
  for (let i = 0; i < spendableUtxos.length; i += CHUNK_SIZE) {
    const chunk = spendableUtxos.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(utxo => filterUtxoMetaprotocol({ utxo, address, provider }))
    );

    // Add valid UTXOs to our selection and update fee for each additional vin utxo
    let updatedFee = minFee;
    for (const { formattedUtxo, isValid } of results) {
      if (isValid) {
        totalAmount += formattedUtxo.satoshis;
        selectedUtxos.push(formattedUtxo);
        updatedFee = estimatedFee ?? minimumFee({
          taprootInputCount: addressType === AddressType.P2TR ? selectedUtxos.length + 1 : 0,
          nonTaprootInputCount: addressType === AddressType.P2TR ? 0 : selectedUtxos.length + 1,
          outputCount: 3,
        });
        if (totalAmount >= amount + updatedFee) {
          return { utxos: selectedUtxos, totalAmount, hasEnough: true };
        }
      }
    }
  }

  // If we get here, we didn't find enough valid UTXOs
  if (allowPartial) {
    return { utxos: selectedUtxos, totalAmount, hasEnough: false };
  }
  
  throw new Error('Insufficient balance of utxos to cover spend amount and fee.');
}

// create a function that takes in an account and uses the account.spendStrategy to get the utxos from each address
export const getAccountSpendableUtxoSet = async ({
  account,
  amount,
  estimatedFee,
  satThreshold = UTXO_ASSET_SAT_THRESHOLD,
  provider,
}: {
  account: Account
  amount: number
  estimatedFee?: number
  satThreshold?: number
  provider: Provider
}): Promise<{ utxos: FormattedUtxo[], totalAmount: number }> => {
  amount = Number(amount);
  let totalAmount = 0;
  const allSelectedUtxos: FormattedUtxo[] = [];
  
  // Iterate through addresses in the spend strategy order
  for (const addressKey of account.spendStrategy.addressOrder) {
    const address = account[addressKey].address;
    
    try {
      // Try to get UTXOs from this address, allowing partial results
      const { utxos: addressUtxos, totalAmount: addressTotalAmount, hasEnough } = await getAddressSpendableUtxoSet({
        address,
        amount: amount - totalAmount, // Only need remaining amount
        estimatedFee,
        satThreshold,
        sortUtxosGreatestToLeast: account.spendStrategy.utxoSortGreatestToLeast,
        provider,
        allowPartial: true,
      });

      // Add UTXOs from this address to our collection
      allSelectedUtxos.push(...addressUtxos);
      totalAmount += addressTotalAmount;
      
      // If we have enough from this address, we're done
      if (hasEnough) {
        return { utxos: allSelectedUtxos, totalAmount };
      }
      
    } catch (error) {
      // If this address fails, continue to the next one
      console.warn(`Failed to get UTXOs from address ${address}:`, error);
      continue;
    }
  }
  
  // If we get here, we didn't find enough UTXOs across all addresses
  throw new Error('Insufficient balance across all addresses to cover spend amount and fee.');
}
