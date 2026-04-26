import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@shared/schema';
import { HowItWorks } from '../components/onboarding/HowItWorks';
import { TasteTest, FilmPick } from '../components/onboarding/TasteTest';
import { StreamersStep } from '../components/onboarding/StreamersStep';
import { FingerprintScreen } from '../components/onboarding/FingerprintScreen';

interface AuthUser extends User {
  needsOnboarding?: boolean;
}

type OnboardingStep = 'how-it-works' | 'taste-test' | 'streamers' | 'fingerprint';

const OnboardingPage = () => {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();

  const isRetake = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('retake') === '1';
  }, [search]);

  const [step, setStep] = useState<OnboardingStep>(isRetake ? 'taste-test' : 'how-it-works');
  const [picks, setPicks] = useState<FilmPick[]>([]);

  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }
    // Returning users who have already completed onboarding go straight to home,
    // unless they're explicitly retaking the taste test from their profile.
    if (!isRetake && (user as AuthUser).needsOnboarding === false) {
      setLocation('/');
    }
  }, [user, setLocation, isRetake]);

  const handleTasteTestComplete = (filmPicks: FilmPick[]) => {
    setPicks(filmPicks);
    // Streamers step runs in both first-run and retake modes so users
    // can update their selections (or clear them) any time.
    setStep('streamers');
  };

  const handleStreamersDone = () => {
    setStep('fingerprint');
  };

  const handleRestart = () => {
    setPicks([]);
    setStep(isRetake ? 'taste-test' : 'how-it-works');
  };

  if (!user) return null;
  if (!isRetake && (user as AuthUser).needsOnboarding === false) return null;

  if (step === 'how-it-works') {
    return <HowItWorks onStart={() => setStep('taste-test')} />;
  }

  if (step === 'taste-test') {
    return <TasteTest onComplete={handleTasteTestComplete} />;
  }

  if (step === 'streamers') {
    return (
      <StreamersStep
        onComplete={handleStreamersDone}
        onSkip={handleStreamersDone}
      />
    );
  }

  return (
    <FingerprintScreen
      picks={picks}
      onRestart={handleRestart}
      retakeMode={isRetake}
    />
  );
};

export default OnboardingPage;
