import AuthLayout from '../layouts/AuthLayout';
import LoginForm from '../auth/LoginForm.jsx';

const Login = () => {
    return (
        <AuthLayout
            title="ScaleUp Admin"
            subtitle="Sign in to manage your storefront"
        >
            <LoginForm />
        </AuthLayout>
    );
};

export default Login;