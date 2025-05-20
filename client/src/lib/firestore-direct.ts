/**
 * Alternative Firestore access implementation when Firebase Authentication fails
 * 
 * This module provides direct Firestore access using the REST API
 * when the Firebase SDK fails with configuration-not-found errors.
 */

// Base URL for Firestore API
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1';

/**
 * Get the Firebase project ID from environment variables
 */
function getProjectId(): string {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
}

/**
 * Get the user ID from localStorage (set during token extraction)
 */
function getUserId(): string | null {
  return localStorage.getItem('customAuthUserId');
}

/**
 * Get a document from Firestore using REST API
 * @param collection The collection name
 * @param document The document ID
 * @returns The document data or null if not found
 */
export async function getFirestoreDocument(collection: string, document: string): Promise<any | null> {
  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('Firebase project ID not available');
      return null;
    }
    
    // Build the Firestore API URL
    const url = `${FIRESTORE_BASE_URL}/projects/${projectId}/databases/(default)/documents/${collection}/${document}`;
    
    // Make the request
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Document not found: ${collection}/${document}`);
        return null;
      }
      const error = await response.json();
      console.error('Error fetching Firestore document:', error);
      return null;
    }
    
    const data = await response.json();
    return convertFirestoreDocumentToObject(data);
  } catch (error) {
    console.error('Error in getFirestoreDocument:', error);
    return null;
  }
}

/**
 * Get all documents in a collection
 * @param collection The collection name
 * @returns Array of documents or empty array if not found or error
 */
export async function getFirestoreCollection(collection: string): Promise<any[]> {
  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('Firebase project ID not available');
      return [];
    }
    
    // Build the Firestore API URL
    const url = `${FIRESTORE_BASE_URL}/projects/${projectId}/databases/(default)/documents/${collection}`;
    
    // Make the request
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching Firestore collection:', error);
      return [];
    }
    
    const data = await response.json();
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(convertFirestoreDocumentToObject);
  } catch (error) {
    console.error('Error in getFirestoreCollection:', error);
    return [];
  }
}

/**
 * Get user preferences from Firestore
 * @returns User preferences or default values
 */
export async function getUserPreferences(): Promise<any> {
  const userId = getUserId();
  if (!userId) {
    console.warn('No user ID available for Firestore operations');
    return null;
  }
  
  try {
    return await getFirestoreDocument(`users/${userId}/preferences`, 'settings');
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

/**
 * Set a document in Firestore using REST API
 * @param collection The collection path
 * @param document The document ID
 * @param data The document data to set
 * @returns Success status
 */
export async function setFirestoreDocument(
  collection: string, 
  document: string, 
  data: any
): Promise<boolean> {
  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('Firebase project ID not available');
      return false;
    }
    
    // Build the Firestore API URL
    const url = `${FIRESTORE_BASE_URL}/projects/${projectId}/databases/(default)/documents/${collection}/${document}`;
    
    // Prepare data in Firestore format
    const firestoreData = {
      fields: convertObjectToFirestoreFields(data)
    };
    
    // Make the request
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error setting Firestore document:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in setFirestoreDocument:', error);
    return false;
  }
}

/**
 * Convert a JavaScript object to Firestore fields format
 * @param obj The object to convert
 * @returns Firestore fields object
 */
function convertObjectToFirestoreFields(obj: any): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      result[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      result[key] = { integerValue: value };
    } else if (typeof value === 'boolean') {
      result[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      result[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'object') {
              return { mapValue: { fields: convertObjectToFirestoreFields(item) } };
            } else if (typeof item === 'string') {
              return { stringValue: item };
            } else if (typeof item === 'number') {
              return { integerValue: item };
            } else if (typeof item === 'boolean') {
              return { booleanValue: item };
            }
            return { nullValue: null };
          })
        }
      };
    } else if (typeof value === 'object') {
      result[key] = { mapValue: { fields: convertObjectToFirestoreFields(value) } };
    }
  }
  
  return result;
}

export function useFirestoreUtils() {
  return {
    getDocument: getFirestoreDocument,
    setDocument: setFirestoreDocument,
    getCollection: getFirestoreCollection,
    getProjectId,
    getUserId
  };
}

/**
 * Get user onboarding ratings from Firestore
 * @returns User onboarding ratings or empty array
 */
export async function getUserOnboardingRatings(): Promise<any[]> {
  const userId = getUserId();
  if (!userId) {
    console.warn('No user ID available for Firestore operations');
    return [];
  }
  
  try {
    const collection = await getFirestoreCollection(`users/${userId}/ratings/onboarding/films`);
    return collection || [];
  } catch (error) {
    console.error('Error fetching user onboarding ratings:', error);
    return [];
  }
}

/**
 * Helper function to convert Firestore document format to regular JS object
 * @param firestoreDoc The Firestore document
 * @returns Plain JavaScript object
 */
function convertFirestoreDocumentToObject(firestoreDoc: any): any {
  if (!firestoreDoc || !firestoreDoc.fields) {
    return null;
  }
  
  const result: any = {};
  
  Object.keys(firestoreDoc.fields).forEach(key => {
    const field = firestoreDoc.fields[key];
    
    // Handle different Firestore field types
    if (field.stringValue !== undefined) {
      result[key] = field.stringValue;
    } else if (field.integerValue !== undefined) {
      result[key] = parseInt(field.integerValue, 10);
    } else if (field.doubleValue !== undefined) {
      result[key] = parseFloat(field.doubleValue);
    } else if (field.booleanValue !== undefined) {
      result[key] = field.booleanValue;
    } else if (field.arrayValue) {
      result[key] = (field.arrayValue.values || []).map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.mapValue !== undefined) return convertFirestoreDocumentToObject({fields: v.mapValue.fields});
        return null;
      });
    } else if (field.mapValue) {
      result[key] = convertFirestoreDocumentToObject({fields: field.mapValue.fields});
    } else if (field.nullValue !== undefined) {
      result[key] = null;
    } else if (field.timestampValue !== undefined) {
      result[key] = new Date(field.timestampValue);
    }
  });
  
  return result;
}