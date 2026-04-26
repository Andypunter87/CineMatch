import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@shared/schema';
import { HowItWorks } from '../components/onboarding/HowItWorks';
import { TasteTest, FilmPick } from '../components/onboarding/TasteTest';
import { FingerprintScreen } from '../components/onboarding/FingerprintScreen';

interface AuthUser extends User {
  needsOnboarding?: boolean;
}

type OnboardingStep = 'how-it-works' | 'taste-test' | 'fingerprint';

const OnboardingPage = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('how-it-works');
  const [picks, setPicks] = useState<FilmPick[]>([]);

  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }
    // Returning users who have already completed onboarding go straight to home
    if ((user as AuthUser).needsOnboarding === false) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleTasteTestComplete = (filmPicks: FilmPick[]) => {
    setPicks(filmPicks);
    setStep('fingerprint');
  };

  const handleRestart = () => {
    setPicks([]);
    setStep('how-it-works');
  };

  if (!user) return null;
  if ((user as AuthUser).needsOnboarding === false) return null;

  if (step === 'how-it-works') {
    return <HowItWorks onStart={() => setStep('taste-test')} />;
  }

  if (step === 'taste-test') {
    return <TasteTest onComplete={handleTasteTestComplete} />;
  }

  return (
    <FingerprintScreen
      picks={picks}
      onRestart={handleRestart}
    />
  );
};

export default OnboardingPage;
