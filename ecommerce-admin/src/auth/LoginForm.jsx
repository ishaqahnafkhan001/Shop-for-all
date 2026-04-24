import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { setUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await API.post('/auth/login', { email, password });
            setUser(res.data.user);
            navigate('/dashboard'); // Redirect after successful login
        } catch (err) {
            setError(err.response?.data?.error || "Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <Input
                id="email"
                label="Email Address"
                type="email"
                placeholder="vendor@scaleup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />

            <Button type="submit" isLoading={isLoading}>
                Sign In
            </Button>
        </form>
    );
};

export default LoginForm;