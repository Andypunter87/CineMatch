import React from 'react';

interface OnboardingStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const OnboardingStepIndicator: React.FC<OnboardingStepIndicatorProps> = ({ 
  currentStep, 
  totalSteps 
}) => {
  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-2 rounded-full transition-colors duration-200 ${
            index === currentStep ? 'bg-primary' : 'bg-primary/20'
          }`}
          aria-label={index === currentStep ? `Current step ${index + 1} of ${totalSteps}` : `Step ${index + 1} of ${totalSteps}`}
        />
      ))}
    </div>
  );
};