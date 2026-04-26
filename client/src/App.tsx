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
import MoodCard from "@/pages/MoodCard";
import ChatRecommenderPage from "@/pages/chat-recommender-page";
import SlotMachinePage from "@/pages/slot-machine-page";
import LoadingPage from "@/pages/loading-page";
import FilmDeckPage from "@/pages/film-deck-page";
import PostWatchPage from "@/pages/post-watch-page";
import GroupInvitePage from "@/pages/group-invite-page";
import GroupJoinPage from "@/pages/group-join-page";
import AuthSuccessPage from "@/pages/auth-success-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import Layout from "@/components/Layout";
import CookieConsent from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ui/error-boundary";

function AppShellRoutes() {
  return (
    <Layout>
      <Switch>
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/watchlist" component={WatchlistPage} />
        <ProtectedRoute path="/friends" component={FriendsPage} />
        <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly={true} />
        <ProtectedRoute path="/onboarding" component={OnboardingPage} />
        <ProtectedRoute path="/chat" component={ChatRecommenderPage} />
        <ProtectedRoute path="/mymood/:year-:month" component={MoodCard} adminOnly={true} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/success" component={AuthSuccessPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/g/:code" component={GroupJoinPage} />
      <Route path="/slot" component={SlotMachinePage} />
      <Route path="/group/slot" component={() => <SlotMachinePage isGroup={true} />} />
      <Route path="/group/invite" component={GroupInvitePage} />
      <Route path="/loading" component={LoadingPage} />
      <Route path="/films" component={FilmDeckPage} />
      <Route path="/rating" component={PostWatchPage} />
      <Route component={AppShellRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <CookieConsent />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
