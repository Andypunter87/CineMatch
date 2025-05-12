import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Film, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface WelcomeCompleteProps {
  userName: string;
  onComplete: () => void;
}

export const WelcomeComplete: React.FC<WelcomeCompleteProps> = ({ 
  userName,
  onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Handle the transition to recommendations with animation
  const handleGoToRecommendations = () => {
    setLoading(true);
    
    // Simulate progress loading animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we get closer to 100%
        const increment = Math.max(1, 10 - Math.floor(prev / 10));
        const newValue = Math.min(98, prev + increment);
        return newValue;
      });
    }, 150);
    
    // Trigger actual completion after animation
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      
      // Small additional delay at 100% before redirecting
      setTimeout(() => {
        onComplete();
      }, 500);
    }, 3000);
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center max-w-md mx-auto">
      {!loading ? (
        // Initial success screen
        <>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6"
          >
            <Check className="w-8 h-8 text-primary" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-3">
            You're all set, {userName}!
          </h2>
          
          <p className="text-muted-foreground mb-8">
            Thanks for sharing your preferences. Let's find something brilliant to watch.
          </p>
          
          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleGoToRecommendations}
          >
            Go to Recommendations
          </Button>
        </>
      ) : (
        // Engaging loading animation
        <>
          <motion.div 
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.05, 0.95, 1.05, 1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5 
            }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8"
          >
            <Film className="w-10 h-10 text-primary" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-3">
            Finding your perfect matches...
          </h2>
          
          <p className="text-muted-foreground mb-6">
            We're curating personalized recommendations based on your taste.
          </p>
          
          <div className="w-full mb-2">
            <Progress value={progress} className="h-2" />
          </div>
          
          <p className="text-xs text-muted-foreground">
            {progress < 30 && "Analyzing your preferences..."}
            {progress >= 30 && progress < 60 && "Searching our film database..."}
            {progress >= 60 && progress < 90 && "Finding the perfect matches..."}
            {progress >= 90 && "Almost ready!"}
          </p>
        </>
      )}
    </div>
  );
};

export default WelcomeComplete;