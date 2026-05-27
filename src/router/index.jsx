import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import VerifyOtp from '@/pages/VerifyOtp'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import Tenants from '@/pages/Tenants'
import TenantDetail from '@/pages/TenantDetail'
import Licenses from '@/pages/Licenses'
import AdminUsers from '@/pages/AdminUsers'
import Tickets from '@/pages/Tickets'
import TicketDetail from '@/pages/TicketDetail'
import TamperEvents from '@/pages/TamperEvents'
import AuditLogs from '@/pages/AuditLogs'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/verify-otp', element: <VerifyOtp /> },
  { path: '/reset-password', element: <ResetPassword /> },
  {
    path: '/',
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'tenants', element: <Tenants /> },
      { path: 'tenants/:id', element: <TenantDetail /> },
      { path: 'licenses', element: <Licenses /> },
      { path: 'tickets', element: <Tickets /> },
      { path: 'tickets/:id', element: <TicketDetail /> },
      { path: 'tamper-events', element: <TamperEvents /> },
      { path: 'audit-logs', element: <AuditLogs /> },
      {
        path: 'admin-users',
        element: <ProtectedRoute requiredRole="SUPER_ADMIN"><AdminUsers /></ProtectedRoute>,
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
