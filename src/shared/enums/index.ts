export const OfferCategory = {
  INTERNET: "INTERNET",
  MINUTES: "MINUTES",
  BUNDLE: "BUNDLE",
  SMS: "SMS",
  CALL_RATE: "CALL_RATE",
  OTHER: "OTHER",
} as const;
export type OfferCategoryType =
  (typeof OfferCategory)[keyof typeof OfferCategory];

export const PaymentProvider = {
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  OTHER: "OTHER",
} as const;
export type PaymentProviderType =
  (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const AccountStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
} as const;
export type AccountStatusType =
  (typeof AccountStatus)[keyof typeof AccountStatus];

export const OrderStatus = {
  ACTIVATION_PENDING: "ACTIVATION_PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

// Valid order state transitions (spec section 29). Enforced centrally so
// no service can accidentally perform an illegal transition.
export const ORDER_STATE_TRANSITIONS: Record<
  OrderStatusType,
  OrderStatusType[]
> = {
  ACTIVATION_PENDING: [
    OrderStatus.PROCESSING,
    OrderStatus.COMPLETED,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  PROCESSING: [
    OrderStatus.COMPLETED,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  COMPLETED: [OrderStatus.REFUNDED],
  FAILED: [OrderStatus.REFUND_PENDING, OrderStatus.REFUNDED, OrderStatus.ACTIVATION_PENDING],
  REFUND_PENDING: [OrderStatus.REFUNDED],
  REFUNDED: [],
  CANCELLED: [OrderStatus.REFUNDED],
};

export const WalletTransactionType = {
  TOP_UP: "TOP_UP",
  PURCHASE: "PURCHASE",
  REFUND: "REFUND",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type WalletTransactionTypeType =
  (typeof WalletTransactionType)[keyof typeof WalletTransactionType];

export const TransactionDirection = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
} as const;
export type TransactionDirectionType =
  (typeof TransactionDirection)[keyof typeof TransactionDirection];
