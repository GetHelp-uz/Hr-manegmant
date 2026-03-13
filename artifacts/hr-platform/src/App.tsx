import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing/index";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard/index";
import Employees from "@/pages/employees/index";
import PrintQR from "@/pages/employees/print-qr";
import Scanner from "@/pages/scanner/index";
import Attendance from "@/pages/attendance/index";
import Devices from "@/pages/devices/index";
import Payroll from "@/pages/payroll/index";
import Reports from "@/pages/reports/index";
import Settings from "@/pages/settings/index";
import Departments from "@/pages/departments/index";
import LeaveRequests from "@/pages/leave-requests/index";
import Advances from "@/pages/advances/index";
import Monitor from "@/pages/monitor/index";
import Join from "@/pages/join/index";
import Staff from "@/pages/staff/index";
import ExportPage from "@/pages/export/index";
import AnalyticsPage from "@/pages/analytics/index";
import BroadcastingPage from "@/pages/broadcasting/index";
import PlatformAdminLogin from "@/pages/platform-admin/login";
import PlatformAdminDashboard from "@/pages/platform-admin/dashboard";
import PlatformAdminCompany from "@/pages/platform-admin/company";
import PlatformAdminSystem from "@/pages/platform-admin/system";
import PlatformAdminAiSettings from "@/pages/platform-admin/ai-settings";
import PlatformAdminSmsSettings from "@/pages/platform-admin/sms-settings";
import PlatformAdminFaceSettings from "@/pages/platform-admin/face-settings";
import PlatformAdminPlans from "@/pages/platform-admin/plans";
import KioskLogin from "@/pages/kiosk/login";
import KioskScan from "@/pages/kiosk/scan";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/join" component={Join} />
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
