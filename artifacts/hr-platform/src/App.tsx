import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

const Landing = lazy(() => import("@/pages/landing/index"));
const Login = lazy(() => import("@/pages/auth/login"));
const Register = lazy(() => import("@/pages/auth/register"));
const Dashboard = lazy(() => import("@/pages/dashboard/index"));
const Employees = lazy(() => import("@/pages/employees/index"));
const PrintQR = lazy(() => import("@/pages/employees/print-qr"));
const Scanner = lazy(() => import("@/pages/scanner/index"));
const Attendance = lazy(() => import("@/pages/attendance/index"));
const Devices = lazy(() => import("@/pages/devices/index"));
const Payroll = lazy(() => import("@/pages/payroll/index"));
const Reports = lazy(() => import("@/pages/reports/index"));
const Settings = lazy(() => import("@/pages/settings/index"));
const Departments = lazy(() => import("@/pages/departments/index"));
const LeaveRequests = lazy(() => import("@/pages/leave-requests/index"));
const Advances = lazy(() => import("@/pages/advances/index"));
const Monitor = lazy(() => import("@/pages/monitor/index"));
const Join = lazy(() => import("@/pages/join/index"));
const Staff = lazy(() => import("@/pages/staff/index"));
const ExportPage = lazy(() => import("@/pages/export/index"));
const AnalyticsPage = lazy(() => import("@/pages/analytics/index"));
const BroadcastingPage = lazy(() => import("@/pages/broadcasting/index"));
const PlatformAdminLogin = lazy(() => import("@/pages/platform-admin/login"));
const PlatformAdminDashboard = lazy(() => import("@/pages/platform-admin/dashboard"));
const PlatformAdminCompany = lazy(() => import("@/pages/platform-admin/company"));
const PlatformAdminSystem = lazy(() => import("@/pages/platform-admin/system"));
const PlatformAdminAiSettings = lazy(() => import("@/pages/platform-admin/ai-settings"));
const PlatformAdminSmsSettings = lazy(() => import("@/pages/platform-admin/sms-settings"));
const PlatformAdminFaceSettings = lazy(() => import("@/pages/platform-admin/face-settings"));
const PlatformAdminPlans = lazy(() => import("@/pages/platform-admin/plans"));
const KioskLogin = lazy(() => import("@/pages/kiosk/login"));
const KioskScan = lazy(() => import("@/pages/kiosk/scan"));
const ShiftsPage = lazy(() => import("@/pages/shifts/index"));
const MePage = lazy(() => import("@/pages/me/index"));
const AuditLogPage = lazy(() => import("@/pages/audit-log/index"));
const OnboardingPage = lazy(() => import("@/pages/onboarding/index"));
const IntegrationsPage = lazy(() => import("@/pages/integrations/index"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/join" component={Join} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/employees/print-qr" component={PrintQR} />
        <Route path="/employees" component={Employees} />
        <Route path="/departments" component={Departments} />
        <Route path="/leave-requests" component={LeaveRequests} />
        <Route path="/advances" component={Advances} />
        <Route path="/monitor" component={Monitor} />
        <Route path="/scanner" component={Scanner} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/devices" component={Devices} />
        <Route path="/payroll" component={Payroll} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/staff" component={Staff} />
        <Route path="/export" component={ExportPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/broadcasting" component={BroadcastingPage} />
        <Route path="/shifts" component={ShiftsPage} />
        <Route path="/me" component={MePage} />
        <Route path="/audit-log" component={AuditLogPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/platform-admin/login" component={PlatformAdminLogin} />
        <Route path="/platform-admin/dashboard" component={PlatformAdminDashboard} />
        <Route path="/platform-admin/companies/:id" component={PlatformAdminCompany} />
        <Route path="/platform-admin/system" component={PlatformAdminSystem} />
        <Route path="/platform-admin/ai-settings" component={PlatformAdminAiSettings} />
        <Route path="/platform-admin/sms-settings" component={PlatformAdminSmsSettings} />
        <Route path="/platform-admin/face-settings" component={PlatformAdminFaceSettings} />
        <Route path="/platform-admin/plans" component={PlatformAdminPlans} />
        <Route path="/kiosk" component={KioskLogin} />
        <Route path="/kiosk/scan" component={KioskScan} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
