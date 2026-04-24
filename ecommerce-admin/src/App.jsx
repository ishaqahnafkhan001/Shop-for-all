import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // For clean error/success popups
import { useAuth } from './context/AuthContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Overview from './pages/dashboard/Overview';
import ProductList from './pages/dashboard/products/ProductList';
import AddProduct from './pages/dashboard/products/AddProduct';
import OrderList from './pages/dashboard/orders/OrderList';
import ShopSettings from './pages/dashboard/settings/ShopSettings';
import EditProduct from './pages/dashboard/products/EditProduct';
import CustomerList from "./pages/dashboard/customers/CustomerList.jsx";

function App() {
    const { user, loading } = useAuth();

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <Router>
            <Toaster position="top-right" />
            <Routes>
                {/* Public / Auth Routes */}
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
                    <Route index element={<Overview />} />
                    <Route path="products" element={<ProductList />} />
                    <Route path="products/add" element={<AddProduct />} />
                    <Route path="products/edit/:id" element={<EditProduct />} />
                    <Route path="orders" element={<OrderList />} />

                    {/* Add the new route here! */}

                    <Route path="customers" element={<CustomerList />} />

                    <Route path="settings" element={<ShopSettings />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
        </Router>
    );
}

export default App;