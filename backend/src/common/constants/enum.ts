export enum UserRoleEnum {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

// Signed by direction in stock_movements.quantity: IN and TRANSFER_IN are
// positive, OUT and TRANSFER_OUT negative, ADJUSTMENT either.
export enum StockMovementTypeEnum {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}
