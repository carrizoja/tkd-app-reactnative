/**
 * Repository pattern. Feature code depends on the `Repository<T>` interface;
 * only `createFirestoreRepository` touches the Firestore SDK, so a later
 * backend swap or offline-cache change never reaches the screens.
 *
 * Each capability defines its own repository interface (extending or composing
 * `Repository<T>`) and its own query methods in `features/<cap>/data/`.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  type FirestoreDataConverter,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { Entity } from "./model/converter";

export interface Repository<T extends Entity> {
  /** Fetch one document by id, or null if it does not exist. */
  getById(id: string): Promise<T | null>;
  /** List documents matching the given query constraints. */
  list(...constraints: QueryConstraint[]): Promise<T[]>;
  /**
   * Create-or-replace a document at a caller-provided id. Used for
   * deterministic-id upserts (attendance, payments) and for entities whose id
   * is derived rather than auto-generated.
   */
  set(id: string, value: Omit<T, "id">): Promise<void>;
  /** Create a document under a Firestore-generated id and return it. */
  create(value: Omit<T, "id">): Promise<T>;
  /** Partially update an existing document. */
  update(id: string, patch: Partial<Omit<T, "id">>): Promise<void>;
  /** Delete a document by id. */
  remove(id: string): Promise<void>;
}

export function createFirestoreRepository<T extends Entity>(
  collectionName: string,
  converter: FirestoreDataConverter<T>,
): Repository<T> {
  const ref = () => collection(getDb(), collectionName).withConverter(converter);
  const docRef = (id: string) => doc(getDb(), collectionName, id).withConverter(converter);

  return {
    async getById(id: string): Promise<T | null> {
      const snap = await getDoc(docRef(id));
      return snap.exists() ? snap.data() : null;
    },
    async list(...constraints: QueryConstraint[]): Promise<T[]> {
      const snap = await getDocs(query(ref(), ...constraints));
      return snap.docs.map((d) => d.data());
    },
    async set(id: string, value: Omit<T, "id">): Promise<void> {
      await setDoc(docRef(id), { id, ...value } as T);
    },
    async create(value: Omit<T, "id">): Promise<T> {
      const created = { id: doc(ref()).id, ...value } as T;
      await setDoc(docRef(created.id), created);
      return created;
    },
    async update(id: string, patch: Partial<Omit<T, "id">>): Promise<void> {
      await updateDoc(doc(getDb(), collectionName, id), patch);
    },
    async remove(id: string): Promise<void> {
      await deleteDoc(doc(getDb(), collectionName, id));
    },
  };
}
