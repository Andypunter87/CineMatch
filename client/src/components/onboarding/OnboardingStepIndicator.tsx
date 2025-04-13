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
    <div className="flex items-center justify-center gap-2 my-4">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === currentStep ? 'w-4 bg-primary' : 'w-2 bg-gray-300'
          }`}
          aria-label={index === currentStep ? 'Current step' : `Step ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default OnboardingStepIndicator;