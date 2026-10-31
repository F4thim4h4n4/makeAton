import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';

// Pages
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import ProductsPage from '../pages/ProductsPage.jsx';
import DiscountsTaxesPage from '../pages/DiscountsTaxesPage.jsx';
import CustomersPage from '../pages/CustomersPage.jsx';
import QuotationsPage from '../pages/QuotationsPage.jsx';
import SubscriptionsPage from '../pages/SubscriptionsPage.jsx';
import InvoicesPage from '../pages/InvoicesPage.jsx';
import PaymentsPage from '../pages/PaymentsPage.jsx';
import ReportsPage from '../pages/ReportsPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* App routes – wrapped in the main layout */}
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"        element={<DashboardPage />} />
        <Route path="/products"         element={<ProductsPage />} />
        <Route path="/discounts-taxes"  element={<DiscountsTaxesPage />} />
        <Route path="/customers"        element={<CustomersPage />} />
        <Route path="/quotations"       element={<QuotationsPage />} />
        <Route path="/subscriptions"    element={<SubscriptionsPage />} />
        <Route path="/invoices"         element={<InvoicesPage />} />
        <Route path="/payments"         element={<PaymentsPage />} />
        <Route path="/reports"          element={<ReportsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
