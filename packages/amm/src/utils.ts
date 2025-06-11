import { AlkaneId } from '@oyl/sdk-alkanes'

/**
 * Operation codes for pool interactions
 */
export enum PoolOpcodes {
  INIT_POOL = 0,
  ADD_LIQUIDITY = 1,
  REMOVE_LIQUIDITY = 2,
  SWAP = 3,
  SIMULATE_SWAP = 4,
  NAME = 99,
  POOL_DETAILS = 999,
}

/**
 * Result of a pool details query
 */
export interface PoolDetailsResult {
  token0: AlkaneId
  token1: AlkaneId
  token0Amount: string
  token1Amount: string
  tokenSupply: string
  poolName: string
}

/**
 * Result of a remove liquidity preview
 */
export interface RemoveLiquidityPreviewResult {
  token0: AlkaneId
  token1: AlkaneId
  token0Amount: bigint
  token1Amount: bigint
}

/**
 * Estimates the expected token amounts when removing liquidity based on pool details
 * @param poolDetails The pool details containing token information and amounts
 * @param tokenAmount The amount of LP tokens to remove
 * @returns The preview result containing expected token amounts
 */
export function estimateRemoveLiquidityAmounts(
  poolDetails: PoolDetailsResult,
  tokenAmount: bigint
): RemoveLiquidityPreviewResult {
  // Calculate the proportion of the pool that the LP tokens represent
  const totalSupply = BigInt(poolDetails.tokenSupply)
  const proportion = (tokenAmount * 10000n) / totalSupply // Using 10000 as a multiplier for precision

  // Calculate the expected token amounts based on the proportion
  const token0Amount = (BigInt(poolDetails.token0Amount) * proportion) / 10000n
  const token1Amount = (BigInt(poolDetails.token1Amount) * proportion) / 10000n

  return {
    token0: poolDetails.token0,
    token1: poolDetails.token1,
    token0Amount,
    token1Amount,
  }
}

export interface SwapBuyAmountResult {
  buyAmount: bigint
  sellTokenFeeAmount: bigint
}
/**
 * Calculates the expected amount of tokens received after a swap
 * @param sellAmount The amount of tokens being sold
 * @param sellTokenReserve The current balance of the token being sold
 * @param buyTokenReserve The current balance of the token being received
 * @param feeRate The fee percentage (0.5% default)
 */
export function swapBuyAmount({
  sellAmount,
  sellTokenReserve,
  buyTokenReserve,
  feeRate,
}: {
  sellAmount: bigint
  sellTokenReserve: bigint
  buyTokenReserve: bigint
  feeRate: bigint
}): SwapBuyAmountResult {
  if (sellAmount <= 0)
    throw new Error('swapBuyAmount: Insufficient sell amount')
  if (sellTokenReserve <= 0 || buyTokenReserve <= 0)
    throw new Error('swapBuyAmount: Insufficient liquidity')
  const sellAmountWithFee = sellAmount * (1000n - feeRate)
  const numerator = sellAmountWithFee * buyTokenReserve
  const denominator = sellTokenReserve * 1000n + sellAmountWithFee
  const buyAmount: bigint = numerator / denominator
  const sellTokenFeeAmount = (sellAmount * feeRate) / 1000n
  return { buyAmount, sellTokenFeeAmount }
}
