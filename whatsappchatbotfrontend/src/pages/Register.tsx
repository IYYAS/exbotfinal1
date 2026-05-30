import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        password: '',
        vendor_name: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Automatically use vendor_name as the username
            const payload = {
                ...formData,
                username: formData.vendor_name.toLowerCase().replace(/\s+/g, '_') // sanitize vendor name to be a valid username
            };
            
            const response = await axios.post('http://localhost:8000/api/users/register/', payload);
            
            // Auto login after successful registration
            login(response.data.access, response.data.user);
            navigate('/');
        } catch (err: any) {
            if (err.response?.data) {
                const errorMsg = Object.values(err.response.data).flat().join(', ');
                setError(errorMsg || 'Failed to register. Please try again.');
            } else {
                setError('Failed to register. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Start your WhatsApp Chatbot journey</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="vendor_name">Username</label>
                        <input
                            id="vendor_name"
                            name="vendor_name"
                            type="text"
                            className="form-input"
                            value={formData.vendor_name}
                            onChange={handleChange}
                            required
                            placeholder="Choose a username"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="phone">Phone Number</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            className="form-input"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Create a strong password"
                        />
                    </div>
                    <button type="submit" className="form-button" disabled={isLoading}>
                        <UserPlus size={20} />
                        {isLoading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
