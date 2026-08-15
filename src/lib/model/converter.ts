/**
 * Helper to build a Firestore data converter for an entity whose in-app model
 * carries an `id` field mirrored from the document id. On read the id comes
 * from `snapshot.id`; on write the id is stripped from the stored data (the
 * document id is the source of truth).
 */
import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from "firebase/firestore";

/** Every stored entity mirrors its document id under `id`. */
export type Entity = { id: string };

export function makeConverter<T extends Entity>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: WithFieldValue<T>): DocumentData {
      const { id, ...data } = model as T;
      void id;
      return data as DocumentData;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions,
    ): T {
      const data = snapshot.data(options) as Omit<T, "id">;
      return { id: snapshot.id, ...data } as T;
    },
  };
}
