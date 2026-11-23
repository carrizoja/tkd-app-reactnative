import { where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { listStudentsBySchool } from "../../student-management/data/repository";
import { paymentConverter, type Payment } from "../model/types";
import { createFeeService, type PaymentStore } from "./fee-service";

export const paymentsRepo = createFirestoreRepository<Payment>(
  COLLECTIONS.payments,
  paymentConverter,
);

// The rules decide payment reads by `schoolId`, so every query filters on it
// (the `schoolId + period` index is in firestore.indexes.json). The rules
// deny updates, so writing a paid period again fails instead of overwriting.
export const firestorePaymentStore: PaymentStore = {
  listBySchoolAndPeriod: (schoolId, period) =>
    paymentsRepo.list(where("schoolId", "==", schoolId), where("period", "==", period)),
  create: ({ id, ...payment }) => paymentsRepo.set(id, payment),
};

/** The app's fee service, backed by Firestore. */
export const feeService = createFeeService(firestorePaymentStore, {
  listStudentsBySchool,
  now: () => new Date(),
});
