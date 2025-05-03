import { useCallback, useState } from 'react';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  writeBatch,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  DocumentReference,
  CollectionReference,
  Query,
  Unsubscribe,
  WhereFilterOp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreErrorHandler } from '@/hooks/use-firestore-error-handler';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for safe Firestore operations with built-in error handling
 */
export function useSafeFirestore<T = DocumentData>(collectionPath?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isError, error, resetError, handleFirestoreError, withErrorHandling } = useFirestoreErrorHandler();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T[]>([]);
  
  // Get a document reference
  const getDocRef = useCallback((docId: string, cPath = collectionPath) => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    return doc(db, cPath, docId) as DocumentReference<T>;
  }, [collectionPath]);
  
  // Get a collection reference
  const getCollectionRef = useCallback((cPath = collectionPath) => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    return collection(db, cPath) as CollectionReference<T>;
  }, [collectionPath]);
  
  // Safely get a document by ID
  const getDocumentById = useCallback(async (
    docId: string, 
    cPath = collectionPath
  ): Promise<T | null> => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    setIsLoading(true);
    try {
      const docRef = getDocRef(docId, cPath);
      const docSnap = await getDoc(docRef);
      setIsLoading(false);
      
      if (docSnap.exists()) {
        return docSnap.data() as T;
      } else {
        return null;
      }
    } catch (err) {
      setIsLoading(false);
      handleFirestoreError(err as Error, 'getDocumentById', { docId, collectionPath: cPath });
      return null;
    }
  }, [collectionPath, getDocRef, handleFirestoreError]);
  
  // Safely query documents
  const queryDocuments = useCallback(async (
    queryConstraints: QueryConstraint[] = [],
    cPath = collectionPath
  ): Promise<T[]> => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    setIsLoading(true);
    resetError();
    
    try {
      const q = query(getCollectionRef(cPath), ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const documents: T[] = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      
      setData(documents);
      setIsLoading(false);
      return documents;
    } catch (err) {
      setIsLoading(false);
      handleFirestoreError(err as Error, 'queryDocuments', { queryConstraints, collectionPath: cPath });
      return [];
    }
  }, [collectionPath, getCollectionRef, handleFirestoreError, resetError]);
  
  // Helper for creating common queries
  const createQueryConstraints = useCallback((
    filters: Array<[string, WhereFilterOp, any]> = [],
    sortBy?: [string, 'asc' | 'desc'],
    limitTo?: number,
    startAfterDoc?: any,
    endBeforeDoc?: any
  ): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [];
    
    // Add filters
    filters.forEach(([field, operator, value]) => {
      constraints.push(where(field, operator, value));
    });
    
    // Add sorting
    if (sortBy) {
      constraints.push(orderBy(sortBy[0], sortBy[1]));
    }
    
    // Add pagination
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    
    if (endBeforeDoc) {
      constraints.push(endBefore(endBeforeDoc));
    }
    
    // Add limit
    if (limitTo) {
      constraints.push(limit(limitTo));
    }
    
    return constraints;
  }, []);
  
  // Safely save a document
  const saveDocument = useCallback(async (
    documentId: string,
    data: Partial<T>,
    cPath = collectionPath,
    options = { merge: true }
  ): Promise<boolean> => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    setIsLoading(true);
    resetError();
    
    try {
      const docRef = getDocRef(documentId, cPath);
      await setDoc(docRef, data, options);
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setIsLoading(false);
      handleFirestoreError(err as Error, 'saveDocument', { documentId, collectionPath: cPath });
      return false;
    }
  }, [collectionPath, getDocRef, handleFirestoreError, resetError]);
  
  // Safely update a document
  const updateDocument = useCallback(async (
    documentId: string,
    data: Partial<T>,
    cPath = collectionPath
  ): Promise<boolean> => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    setIsLoading(true);
    resetError();
    
    try {
      const docRef = getDocRef(documentId, cPath);
      await updateDoc(docRef, data as any);
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setIsLoading(false);
      handleFirestoreError(err as Error, 'updateDocument', { documentId, collectionPath: cPath });
      return false;
    }
  }, [collectionPath, getDocRef, handleFirestoreError, resetError]);
  
  // Safely delete a document
  const deleteDocument = useCallback(async (
    documentId: string,
    cPath = collectionPath
  ): Promise<boolean> => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    setIsLoading(true);
    resetError();
    
    try {
      const docRef = getDocRef(documentId, cPath);
      await deleteDoc(docRef);
      
      setIsLoading(false);
      toast({
        title: 'Success',
        description: 'Document successfully deleted',
      });
      return true;
    } catch (err) {
      setIsLoading(false);
      handleFirestoreError(err as Error, 'deleteDocument', { documentId, collectionPath: cPath });
      return false;
    }
  }, [collectionPath, getDocRef, handleFirestoreError, resetError, toast]);
  
  // Safely perform batch operations
  const performBatchOperation = useCallback(async (
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      documentId: string;
      data?: Partial<T>;
      collectionPath?: string;
      options?: { merge: boolean };
    }>
  ): Promise<boolean> => {
    if (operations.length === 0) {
      return true;
    }
    
    setIsLoading(true);
    resetError();
    
    try {
      // Split into batches of 500 operations
      const batchSize = 450; // Buffer for safety
      const batches = [];
      
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = operations.slice(i, i + batchSize);
        
        currentBatch.forEach((operation) => {
          const cPath = operation.collectionPath || collectionPath;
          if (!cPath) {
            throw new Error('Collection path is required');
          }
          
          const docRef = doc(db, cPath, operation.documentId);
          
          if (operation.type === 'set') {
            batch.set(docRef, operation.data || {}, operation.options);
          } else if (operation.type === 'update') {
            batch.update(docRef, operation.data || {});
          } else if (operation.type === 'delete') {
            batch.delete(docRef);
          }
        });
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      setIsLoading(false);
      return true;
    } catch (err) {
      setIsLoading(false);
      handleFirestoreError(err as Error, 'performBatchOperation');
      return false;
    }
  }, [collectionPath, handleFirestoreError, resetError]);
  
  // Set up a real-time listener
  const subscribeToQuery = useCallback((
    queryConstraints: QueryConstraint[] = [],
    callback: (items: T[]) => void,
    onError?: (error: Error) => void,
    cPath = collectionPath
  ): Unsubscribe => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    const q = query(getCollectionRef(cPath), ...queryConstraints);
    
    return onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as unknown as T);
        });
        callback(items);
      },
      (err) => {
        handleFirestoreError(err as Error, 'subscribeToQuery', { collectionPath: cPath });
        if (onError) {
          onError(err as Error);
        }
      }
    );
  }, [collectionPath, getCollectionRef, handleFirestoreError]);
  
  // Set up a real-time listener for a single document
  const subscribeToDocument = useCallback((
    documentId: string,
    callback: (item: T | null) => void,
    onError?: (error: Error) => void,
    cPath = collectionPath
  ): Unsubscribe => {
    if (!cPath) {
      throw new Error('Collection path is required');
    }
    
    const docRef = getDocRef(documentId, cPath);
    
    return onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() } as unknown as T);
        } else {
          callback(null);
        }
      },
      (err) => {
        handleFirestoreError(err as Error, 'subscribeToDocument', { documentId, collectionPath: cPath });
        if (onError) {
          onError(err as Error);
        }
      }
    );
  }, [collectionPath, getDocRef, handleFirestoreError]);
  
  return {
    // Data and loading states
    data,
    isLoading,
    isError,
    error,
    resetError,
    
    // Firestore operations
    getDocumentById: withErrorHandling(getDocumentById, 'getDocumentById'),
    queryDocuments: withErrorHandling(queryDocuments, 'queryDocuments'),
    saveDocument: withErrorHandling(saveDocument, 'saveDocument'),
    updateDocument: withErrorHandling(updateDocument, 'updateDocument'),
    deleteDocument: withErrorHandling(deleteDocument, 'deleteDocument'),
    performBatchOperation: withErrorHandling(performBatchOperation, 'performBatchOperation'),
    
    // Helpers
    createQueryConstraints,
    getCollectionRef,
    getDocRef,
    
    // Real-time subscriptions
    subscribeToQuery,
    subscribeToDocument,
  };
}