import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  writeBatch, 
  updateDoc,
  Firestore,
  DocumentReference,
  DocumentData,
  WhereFilterOp,
  QueryConstraint
} from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { db } from '@/lib/firebase';
import { createAppError, ErrorCategory, useErrorToast } from '@/lib/error-utils';

type BatchOperation<T> = {
  type: 'set' | 'update' | 'delete';
  documentId: string;
  data?: T;
};

/**
 * Hook for safe Firestore operations with comprehensive error handling
 * @param collectionPath The Firestore collection path
 */
export function useSafeFirestore<T extends Record<string, any>>(collectionPath: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const { showErrorToast } = useErrorToast();

  // Helper to handle errors consistently
  const handleFirestoreError = useCallback((error: unknown, operation: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const appError = createAppError(
      `Firestore operation failed: ${errorMessage}`,
      ErrorCategory.FIRESTORE,
      operation
    );
    
    console.error(`[Firestore Error] ${operation}:`, error);
    setLastError(appError);
    return appError;
  }, []);

  // Check if Firestore is available and collection path is valid
  const validateRequest = useCallback(() => {
    if (!collectionPath) {
      const error = createAppError(
        'Collection path is required',
        ErrorCategory.FIRESTORE,
        'validateRequest'
      );
      setLastError(error);
      return { valid: false, error };
    }
    
    if (!db) {
      const error = createAppError(
        'Firestore is not initialized',
        ErrorCategory.FIRESTORE,
        'validateRequest'
      );
      setLastError(error);
      return { valid: false, error };
    }
    
    return { valid: true, error: null };
  }, [collectionPath]);

  // Save a document with a specific ID
  const saveDocument = useCallback(async (documentId: string, data: T): Promise<boolean> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return false;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const docRef = doc(db, collectionPath, documentId);
      await setDoc(docRef, data);
      setIsLoading(false);
      return true;
    } catch (error) {
      const appError = handleFirestoreError(error, 'saveDocument');
      showErrorToast(appError, 'Failed to Save Data');
      setIsLoading(false);
      return false;
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Update a document with partial data
  const updateDocument = useCallback(async (documentId: string, data: Partial<T>): Promise<boolean> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return false;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const docRef = doc(db, collectionPath, documentId);
      await updateDoc(docRef, data as DocumentData);
      setIsLoading(false);
      return true;
    } catch (error) {
      const appError = handleFirestoreError(error, 'updateDocument');
      showErrorToast(appError, 'Failed to Update Data');
      setIsLoading(false);
      return false;
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Add a new document with auto-generated ID
  const addDocument = useCallback(async (data: T): Promise<string | null> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return null;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const collectionRef = collection(db, collectionPath);
      const docRef = await addDoc(collectionRef, data);
      setIsLoading(false);
      return docRef.id;
    } catch (error) {
      const appError = handleFirestoreError(error, 'addDocument');
      showErrorToast(appError, 'Failed to Add Document');
      setIsLoading(false);
      return null;
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Get a document by ID
  const getDocument = useCallback(async (documentId: string): Promise<T | null> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return null;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const docRef = doc(db, collectionPath, documentId);
      const docSnap = await getDoc(docRef);
      
      setIsLoading(false);
      
      if (docSnap.exists()) {
        return docSnap.data() as T;
      } else {
        return null;
      }
    } catch (error) {
      const appError = handleFirestoreError(error, 'getDocument');
      showErrorToast(appError, 'Failed to Load Document');
      setIsLoading(false);
      return null;
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Delete a document by ID
  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return false;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const docRef = doc(db, collectionPath, documentId);
      await deleteDoc(docRef);
      setIsLoading(false);
      return true;
    } catch (error) {
      const appError = handleFirestoreError(error, 'deleteDocument');
      showErrorToast(appError, 'Failed to Delete Document');
      setIsLoading(false);
      return false;
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Query documents with where clauses
  const queryDocuments = useCallback(async (
    conditions: Array<[string, WhereFilterOp, any]> = []
  ): Promise<T[]> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return [];
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const collectionRef = collection(db, collectionPath);
      
      let queryRef;
      if (conditions.length > 0) {
        const queryConstraints: QueryConstraint[] = conditions.map(
          ([field, operator, value]) => where(field, operator, value)
        );
        queryRef = query(collectionRef, ...queryConstraints);
      } else {
        queryRef = query(collectionRef);
      }
      
      const querySnapshot = await getDocs(queryRef);
      setIsLoading(false);
      
      return querySnapshot.docs.map(doc => {
        // Create a data object with the document data and ID
        const data = doc.data() as Record<string, any>;
        return {
          ...data,
          id: doc.id
        } as unknown as T;
      });
    } catch (error) {
      const appError = handleFirestoreError(error, 'queryDocuments');
      showErrorToast(appError, 'Failed to Query Documents');
      setIsLoading(false);
      return [];
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Perform batch operations
  const performBatchOperation = useCallback(async (
    operations: Array<BatchOperation<T>>
  ): Promise<boolean> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return false;
    }
    
    if (operations.length === 0) {
      return true;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const batch = writeBatch(db);
      
      for (const operation of operations) {
        const docRef = doc(db, collectionPath, operation.documentId);
        
        switch (operation.type) {
          case 'set':
            if (operation.data) {
              batch.set(docRef, operation.data);
            }
            break;
          case 'update':
            if (operation.data) {
              batch.update(docRef, operation.data as DocumentData);
            }
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
      setIsLoading(false);
      return true;
    } catch (error) {
      const appError = handleFirestoreError(error, 'performBatchOperation');
      showErrorToast(appError, 'Failed to Perform Batch Operation');
      setIsLoading(false);
      return false;
    }
  }, [collectionPath, validateRequest, handleFirestoreError, showErrorToast]);

  // Check if a document exists
  const documentExists = useCallback(async (documentId: string): Promise<boolean> => {
    const validation = validateRequest();
    if (!validation.valid) {
      return false;
    }
    
    try {
      const docRef = doc(db, collectionPath, documentId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      handleFirestoreError(error, 'documentExists');
      return false;
    }
  }, [collectionPath, validateRequest, handleFirestoreError]);

  return {
    // Methods
    saveDocument,
    updateDocument,
    addDocument,
    getDocument,
    deleteDocument,
    queryDocuments,
    performBatchOperation,
    documentExists,
    
    // State
    isLoading,
    lastError,
    
    // Clear error state
    clearError: () => setLastError(null),
  };
}