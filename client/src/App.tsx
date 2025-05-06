import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { NavBar } from "@/components/layout/nav-bar";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminManage from "@/pages/admin/manage";
import AdminFixtures from "@/pages/admin/fixtures";
import ManageFixtures from "@/pages/admin/manage-fixtures";
import PlayerDashboard from "@/pages/player/dashboard";
import GameWeeksPage from "@/pages/player/game-weeks";

function Router() {
  return (
    <>
      <NavBar />
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/admin" component={AdminDashboard} />
        <ProtectedRoute path="/admin/manage" component={AdminManage} />
        <ProtectedRoute path="/admin/fixtures" component={AdminFixtures} />
        <ProtectedRoute path="/admin/manage-fixtures" component={ManageFixtures} />
        <ProtectedRoute path="/game-weeks" component={GameWeeksPage} />
        <ProtectedRoute path="/" component={PlayerDashboard} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;