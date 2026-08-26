export type ActorType = "CUSTOMER" | "ADMIN" | "PAYMENT_DEVICE";

export interface CustomerActor {
  type: "CUSTOMER";
  userId: string;
  sessionId: string;
  deviceId: string;
}

export interface AdminActor {
  type: "ADMIN";
  adminId: string;
}

export interface PaymentDeviceActor {
  type: "PAYMENT_DEVICE";
  paymentDeviceId: string;
  adminId: string;
  deviceId: string;
}

export type Actor = CustomerActor | AdminActor | PaymentDeviceActor;

// Augment Express's Request type so `req.actor` is available everywhere
// after the auth middleware has run, without resorting to `any`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}
