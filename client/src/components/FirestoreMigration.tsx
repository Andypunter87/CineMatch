import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { migrateUserData, hasUserBeenMigrated, MigrationResult } from '@/utils/firestore-migration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Component for migrating user data from the old Firestore structure
 * to the new schema with subcollections
 */
export function FirestoreMigration() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'not_checked' | 'needed' | 'already_migrated'>('not_checked');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if the user's data has already been migrated
  const checkMigrationStatus = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const isMigrated = await hasUserBeenMigrated(user.id);
      setMigrationStatus(isMigrated ? 'already_migrated' : 'needed');
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger the migration
  const runMigration = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setMigrationResult(null);
      
      const result = await migrateUserData(user.id);
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus('already_migrated');
      }
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-4xl mx-auto my-8">
        <CardHeader>
          <CardTitle>Firestore Migration</CardTitle>
          <CardDescription>You need to be logged in to migrate your data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Firestore Data Migration</CardTitle>
        <CardDescription>
          Migrate your data from the old Firestore structure to the new schema with subcollections
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Migration Status</h3>
            
            {migrationStatus === 'not_checked' && (
              <div>
                <p className="mb-4">Click the button below to check if your data needs migration</p>
                <Button onClick={checkMigrationStatus} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
                  ) : (
                    'Check Migration Status'
                  )}
                </Button>
              </div>
            )}
            
            {migrationStatus === 'needed' && (
              <div>
                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertTitle>Migration needed</AlertTitle>
                  <AlertDescription>
                    Your data needs to be migrated to the new structure. This will copy your preferences, 
                    film ratings, and watchlist items to the new Firestore schema.
                  </AlertDescription>
                </Alert>
                
                <Button onClick={runMigration} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Migrating...</>
                  ) : (
                    'Start Migration'
                  )}
                </Button>
              </div>
            )}
            
            {migrationStatus === 'already_migrated' && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertTitle>Migration complete</AlertTitle>
                <AlertDescription>
                  Your data has already been migrated to the new structure. No further action is needed.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert className="bg-destructive/10 text-destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          {migrationResult && (
            <>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Migration Results</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">Documents Migrated</p>
                    <p className="text-2xl font-bold">{migrationResult.migratedCount}</p>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold">{migrationResult.errorCount}</p>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold">{migrationResult.success ? 'Success' : 'Failed'}</p>
                  </div>
                </div>
                
                <h4 className="font-medium mt-4">Details:</h4>
                <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-auto">
                  <ul className="space-y-1">
                    {migrationResult.details.map((detail, i) => (
                      <li key={i} className="text-sm">• {detail}</li>
                    ))}
                  </ul>
                </div>
                
                {migrationResult.errorCount > 0 && (
                  <>
                    <h4 className="font-medium mt-4">Errors:</h4>
                    <div className="bg-destructive/10 p-4 rounded-md text-destructive max-h-[200px] overflow-auto">
                      <ul className="space-y-1">
                        {migrationResult.errors.map((error, i) => (
                          <li key={i} className="text-sm">• {error.message || JSON.stringify(error)}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          User ID: {user.id} | Username: {user.username}
        </p>
      </CardFooter>
    </Card>
  );
}