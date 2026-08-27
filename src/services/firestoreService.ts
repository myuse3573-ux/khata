import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
  DocumentData,
  QueryConstraint
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";

/**
 * Helper to ensure Firestore is available
 */
const checkDb = (): boolean => {
  if (!isFirebaseConfigured() || !db) {
    console.warn("[Firestore] Firebase/Firestore is not configured. Please set your credentials in .env");
    return false;
  }
  return true;
};

/**
 * Generic Firestore Service for Khata
 */
export const firestoreService = {
  /**
   * Check if Firestore is configured & ready
   */
  isReady: (): boolean => checkDb(),

  /**
   * Get all documents from a collection or user-scoped subcollection
   */
  async getCollection<T = DocumentData>(
    collectionPath: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    if (!checkDb()) return [];
    try {
      const colRef = collection(db!, collectionPath);
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as unknown as T[];
    } catch (error) {
      console.error(`[Firestore] Error fetching collection ${collectionPath}:`, error);
      throw error;
    }
  },

  /**
   * Get a single document by ID
   */
  async getDocument<T = DocumentData>(
    collectionPath: string,
    docId: string
  ): Promise<T | null> {
    if (!checkDb()) return null;
    try {
      const docRef = doc(db!, collectionPath, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as unknown as T;
      }
      return null;
    } catch (error) {
      console.error(`[Firestore] Error getting document ${collectionPath}/${docId}:`, error);
      throw error;
    }
  },

  /**
   * Add a new document with auto-generated ID
   */
  async addDocument<T extends Record<string, any>>(
    collectionPath: string,
    data: T
  ): Promise<string | null> {
    if (!checkDb()) return null;
    try {
      const colRef = collection(db!, collectionPath);
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error(`[Firestore] Error adding document to ${collectionPath}:`, error);
      throw error;
    }
  },

  /**
   * Set or overwrite a document with a specific ID
   */
  async setDocument<T extends Record<string, any>>(
    collectionPath: string,
    docId: string,
    data: T,
    merge: boolean = true
  ): Promise<boolean> {
    if (!checkDb()) return false;
    try {
      const docRef = doc(db!, collectionPath, docId);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge });
      return true;
    } catch (error) {
      console.error(`[Firestore] Error setting document ${collectionPath}/${docId}:`, error);
      throw error;
    }
  },

  /**
   * Update fields in a document
   */
  async updateDocument(
    collectionPath: string,
    docId: string,
    data: Record<string, any>
  ): Promise<boolean> {
    if (!checkDb()) return false;
    try {
      const docRef = doc(db!, collectionPath, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`[Firestore] Error updating document ${collectionPath}/${docId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a document
   */
  async deleteDocument(
    collectionPath: string,
    docId: string
  ): Promise<boolean> {
    if (!checkDb()) return false;
    try {
      const docRef = doc(db!, collectionPath, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[Firestore] Error deleting document ${collectionPath}/${docId}:`, error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time updates on a collection
   */
  subscribeToCollection<T = DocumentData>(
    collectionPath: string,
    onUpdate: (docs: T[]) => void,
    onError?: (error: Error) => void,
    constraints: QueryConstraint[] = []
  ): Unsubscribe | null {
    if (!checkDb()) return null;
    try {
      const colRef = collection(db!, collectionPath);
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      return onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as unknown as T[];
          onUpdate(docs);
        },
        (error) => {
          console.error(`[Firestore] Subscription error for ${collectionPath}:`, error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error(`[Firestore] Could not start subscription for ${collectionPath}:`, error);
      return null;
    }
  },

  /**
   * Batch upload or sync an array of items to a collection
   */
  async syncBatch<T extends { id?: string }>(
    collectionPath: string,
    items: T[]
  ): Promise<boolean> {
    if (!checkDb() || items.length === 0) return false;
    try {
      const batch = writeBatch(db!);
      items.forEach((item) => {
        const docId = item.id || doc(collection(db!, collectionPath)).id;
        const docRef = doc(db!, collectionPath, docId);
        batch.set(docRef, {
          ...item,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error(`[Firestore] Batch sync failed for ${collectionPath}:`, error);
      throw error;
    }
  }
};
