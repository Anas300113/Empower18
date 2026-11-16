import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";

const Admin = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Admin })));
const Applications = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Applications })));
const Careers = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Careers })));
const Dashboard = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Dashboard })));
const Explore = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Explore })));
const NotificationsPage = lazy(() => import("@/pages/Platform").then(module => ({ default: module.NotificationsPage })));
const OpportunityDetail = lazy(() => import("@/pages/Platform").then(module => ({ default: module.OpportunityDetail })));
const Settings = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Settings })));
const Support = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Support })));
const Tools = lazy(() => import("@/pages/Platform").then(module => ({ default: module.Tools })));

function PageFallback() {
  return <main className="container-wide platform-main">Loading page…</main>;
}

function StudentGate({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, profileLoading } = useAuth();
  if (loading || profileLoading) return <main className="container-wide platform-main">Loading your account…</main>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, profileLoading, roles } = useAuth();
  if (loading || profileLoading) return <main className="container-wide platform-main">Checking access…</main>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!roles.includes("admin")) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

function Router() {
  return <Suspense fallback={<PageFallback />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/login" component={Login} />
    <Route path="/register" component={Register} />
    <Route path="/forgot-password" component={ForgotPassword} />
    <Route path="/reset-password" component={ResetPassword} />
    <Route path="/verify-email" component={VerifyEmail} />
    <Route path="/onboarding"><StudentGate><Onboarding /></StudentGate></Route>
    <Route path="/dashboard"><StudentGate><Dashboard /></StudentGate></Route>
    <Route path="/opportunities" component={Explore} />
    <Route path="/opportunities/:id">{params => <OpportunityDetail id={params.id} />}</Route>
    <Route path="/careers"><StudentGate><Careers /></StudentGate></Route>
    <Route path="/applications"><StudentGate><Applications /></StudentGate></Route>
    <Route path="/tools"><StudentGate><Tools /></StudentGate></Route>
    <Route path="/notifications"><StudentGate><NotificationsPage /></StudentGate></Route>
    <Route path="/support" component={Support} />
    <Route path="/settings"><StudentGate><Settings /></StudentGate></Route>
    <Route path="/admin"><AdminGate><Admin /></AdminGate></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><Toaster /><a className="skip-link" href="#main-content">Skip to main content</a><Router /></ThemeProvider></ErrorBoundary>;
}
