import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore.js';
import { useThemeStore } from './store/useThemeStore.js';

import { AppLayout } from './components/layout/AppLayout.js';
const LandingPage = lazy(() => import('./pages/LandingPage.js').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage.js').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage.js').then((m) => ({ default: m.RegisterPage })));
const PublicCareersPage = lazy(() => import('./pages/PublicCareersPage.js').then((m) => ({ default: m.PublicCareersPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage.js').then((m) => ({ default: m.DashboardPage })));
const RecruitingPage = lazy(() => import('./pages/RecruitingPage.js').then((m) => ({ default: m.RecruitingPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.js').then((m) => ({ default: m.OnboardingPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage.js').then((m) => ({ default: m.EmployeesPage })));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage.js').then((m) => ({ default: m.OrgChartPage })));
const AttendancePage = lazy(() => import('./pages/AttendancePage.js').then((m) => ({ default: m.AttendancePage })));
const LeavePage = lazy(() => import('./pages/LeavePage.js').then((m) => ({ default: m.LeavePage })));
const PayrollExpensesPage = lazy(() => import('./pages/PayrollExpensesPage.js').then((m) => ({ default: m.PayrollExpensesPage })));
const CompliancePage = lazy(() => import('./pages/CompliancePage.js').then((m) => ({ default: m.CompliancePage })));
const EmailCenterPage = lazy(() => import('./pages/EmailCenterPage.js').then((m) => ({ default: m.EmailCenterPage })));
const AgentsControlPage = lazy(() => import('./pages/AgentsControlPage.js').then((m) => ({ default: m.AgentsControlPage })));
const AutocodingPage = lazy(() => import('./pages/AutocodingPage.js').then((m) => ({ default: m.AutocodingPage })));
const DynamicModuleRenderer = lazy(() => import('./components/modules/DynamicModuleRenderer.js').then((m) => ({ default: m.DynamicModuleRenderer })));
const AdminPage = lazy(() => import('./pages/AdminPage.js').then((m) => ({ default: m.AdminPage })));
const DeveloperGuidePage = lazy(() => import('./pages/DeveloperGuidePage.js').then((m) => ({ default: m.DeveloperGuidePage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  const { initialize } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    initialize();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [initialize, theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div role="status" className="min-h-screen grid place-items-center text-slate-500">Loading NextDay…</div>}>
        <Routes>
          {/* Public Landing & Auth */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/careers" element={<PublicCareersPage />} />
          <Route path="/careers/:tenantSlug" element={<PublicCareersPage />} />

          {/* Authenticated Workspace */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/recruiting" element={<RecruitingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/org-chart" element={<OrgChartPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route path="/payroll-expenses" element={<PayrollExpensesPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/emails" element={<EmailCenterPage />} />
            <Route path="/agents" element={<AgentsControlPage />} />
            <Route path="/autocoding" element={<AutocodingPage />} />
            <Route path="/modules/:slug" element={<DynamicModuleRenderer />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/developer-guide" element={<DeveloperGuidePage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
