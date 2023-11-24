export interface RewardsQuery {
  at: string;
}

export interface RewardsParam {
  id: string;
  redeemParam?: string;
}

export interface Rewards {
  availableAt: string
  redeemedAt: string | null
  expiresAt: string
}