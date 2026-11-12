import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import { Admin, Applications, Careers, Dashboard, Explore, NotificationsPage, OpportunityDetail, Settings, Support, Tools } from "@/pages/Platform";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/onboarding" component={Onboarding} />
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/opportunities" component={Explore} />
    <Route path="/opportunities/:id">{params => <OpportunityDetail id={params.id} />}</Route>
    <Route path="/careers" component={Careers} />
    <Route path="/applications" component={Applications} />
    <Route path="/tools" component={Tools} />
    <Route path="/notifications" component={NotificationsPage} />
    <Route path="/support" component={Support} />
    <Route path="/settings" component={Settings} />
    <Route path="/admin" component={Admin} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><Toaster /><a className="skip-link" href="#main-content">Skip to main content</a><Router /></ThemeProvider></ErrorBoundary>;
}
