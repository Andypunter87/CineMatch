import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface WelcomeCompleteProps {
  userName: string;
  onComplete: () => void;
}

export const WelcomeComplete: React.FC<WelcomeCompleteProps> = ({ 
  userName,
  onComplete
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Check className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold mb-3">
        You're all set, {userName}!
      </h2>
      
      <p className="text-muted-foreground mb-8">
        Thanks for sharing your preferences. Let's find something brilliant to watch.
      </p>
      
      <Button 
        size="lg" 
        className="w-full" 
        onClick={onComplete}
      >
        Go to Recommendations
      </Button>
    </div>
  );
};

export default WelcomeComplete;