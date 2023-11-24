interface RewardsQuery {
  at: string;
}

interface RewardsParam {
  id: string;
  redeemParam?: string;
}

interface Rewards {
  availableAt: string
  redeemedAt: string | null
  expiresAt: string
}