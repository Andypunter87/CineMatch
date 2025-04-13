import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface WelcomeCompleteProps {
  userName: string;
  onComplete: () => void;
}

export const WelcomeComplete: React.FC<WelcomeCompleteProps> = ({ 
  userName, 
  onComplete 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="w-full flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">You're all set, {userName}!</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Thanks for helping us understand your taste. Let's find something brilliant to watch!
          </p>
          
          <div className="mt-6 p-4 bg-primary/5 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">What's next?</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left list-disc list-inside">
              <li>Discover movies based on your current mood</li>
              <li>Add friends to get group recommendations</li>
              <li>Save films to your watchlist for later</li>
              <li>Rate more films to improve suggestions</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button className="w-full" onClick={onComplete}>
            Go to Recommendations
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};