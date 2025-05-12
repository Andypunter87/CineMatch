import React from 'react';

interface OnboardingStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[]; // Optional descriptive labels
}

export const OnboardingStepIndicator: React.FC<OnboardingStepIndicatorProps> = ({ 
  currentStep, 
  totalSteps,
  stepLabels = ['Preferences', 'Rate Films', 'Recommendations'] // Default labels
}) => {
  return (
    <div className="mb-6 mt-2">
      {/* Step number and overall progress */}
      <div className="text-center mb-2">
        <span className="text-sm font-medium text-blue-700">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>
      
      {/* Visual indicators */}
      <div className="flex items-center justify-center gap-3 mb-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`rounded-full transition-all duration-300 flex flex-col items-center ${
              index === currentStep ? 'scale-110' : 'opacity-70'
            }`}
          >
            <div className={`h-3 w-${index <= currentStep ? '12' : '8'} rounded-full transition-all duration-300 ${
              index < currentStep ? 'bg-green-500' : 
              index === currentStep ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
            }`}
            aria-label={index === currentStep ? 'Current step' : `Step ${index + 1}`}
            />
            
            {/* Step labels */}
            {stepLabels && stepLabels[index] && (
              <span className={`text-xs mt-1 font-medium transition-all ${
                index === currentStep ? 'text-blue-700' : 'text-gray-500'
              }`}>
                {stepLabels[index]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnboardingStepIndicator;