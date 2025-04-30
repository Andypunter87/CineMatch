import React from 'react';
import { OnboardingTest } from '@/components/onboarding/OnboardingTest';

export default function OnboardingTestPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Onboarding API Test</h1>
      <OnboardingTest />
    </div>
  );
}