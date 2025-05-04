import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import WatchlistPage from "@/pages/watchlist-page";
import TermsPage from "@/pages/terms-page";
import PrivacyPage from "@/pages/privacy-page";
import AdminDashboard from "@/pages/admin-dashboard";
import FriendsPage from "@/pages/friends-page";
import OnboardingPage from "@/pages/onboarding-page";
import OnboardingTestPage from "@/pages/onboarding-test-page";
import ErrorHandlingDemo from "@/pages/error-handling-demo";
import FirestoreDemoPage from "@/pages/firestore-demo";
import FirestoreTestReport from "@/pages/firestore-test-report";
import FirebaseAuthDebug from "@/pages/firebase-auth-debug";
import FirestoreTestPage from "@/pages/firestore-test-page";
import { AuthProvider } from "@/hooks/use-auth";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { ProtectedRoute } from "./lib/protected-route";
import Layout from "@/components/Layout";
import CookieConsent from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ui/error-boundary";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/watchlist" component={WatchlistPage} />
      <ProtectedRoute path="/friends" component={FriendsPage} />
      <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly={true} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} />
      <ProtectedRoute path="/onboarding-test" component={OnboardingTestPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/error-handling-demo" component={ErrorHandlingDemo} />
      <ProtectedRoute path="/firestore-demo" component={FirestoreDemoPage} />
      <ProtectedRoute path="/firestore-test-report" component={FirestoreTestReport} />
      <ProtectedRoute path="/firebase-auth-debug" component={FirebaseAuthDebug} />
      <ProtectedRoute path="/firestore-test" component={FirestoreTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FirebaseAuthProvider>
            <Layout>
              <Router />
            </Layout>
            <CookieConsent />
            <Toaster />
          </FirebaseAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
