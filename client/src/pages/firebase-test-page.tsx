import { useAuth } from '@/hooks/use-auth';
import { FirebaseAuthDebug } from '@/components/FirebaseAuthDebug';
import { FirestoreClientTest } from '@/components/FirestoreClientTest';

/**
 * A dedicated page for testing Firebase/Firestore integration
 */
export default function FirebaseTestPage() {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Firebase/Firestore Integration Tests</h1>
      
      {!user ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-6">
          <div className="font-medium text-yellow-800 mb-2">Not Authenticated</div>
          <p className="text-yellow-700">
            You need to be logged in to perform these tests. Please log in first.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Firebase Authentication</h2>
            <FirebaseAuthDebug />
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Firestore Client Test</h2>
            <FirestoreClientTest />
          </div>
        </>
      )}
    </div>
  );
}