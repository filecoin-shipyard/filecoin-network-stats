import BigNumber from 'bignumber.js';

export interface CostCapacityForMinerStat {
  count: number
  averageStoragePrice: BigNumber
  averageCapacityGB: number
}

export interface CostCapacityForMinerStatJSON {
  count: number
  averageStoragePrice: string
  averageCapacityGB: number
}

export function costCapacityForMinerStatToJSON(stat: CostCapacityForMinerStat): CostCapacityForMinerStatJSON {
  return {
    count: stat.count,
    averageStoragePrice: stat.averageStoragePrice.toFixed(16),
    averageCapacityGB: stat.averageCapacityGB,
  };
}

export function costCapacityForMinerStatFromJSON(stat: CostCapacityForMinerStatJSON): CostCapacityForMinerStat {
  return {
    count: stat.count,
    averageStoragePrice: new BigNumber(stat.averageStoragePrice),
    averageCapacityGB: stat.averageCapacityGB,
  };
}