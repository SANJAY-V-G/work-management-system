import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/api';

const Login = ({ setToken, setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegistering) {
                await registerUser(username, password);
                setIsRegistering(false);
                alert('Registration successful! Please login.');
            } else {
                const response = await loginUser(username, password);
                const token = response.data.access_token;
                localStorage.setItem('token', token);
                setToken(token);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-96 transform transition-all hover:scale-105 duration-300">
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded" role="alert"><p>{error}</p></div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transform transition hover:-translate-y-1 duration-200 shadow-lg"
                    >
                        {isRegistering ? 'Sign Up' : 'Sign In'}
                    </button>
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-200"
                            onClick={() => setIsRegistering(!isRegistering)}
                        >
                            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
