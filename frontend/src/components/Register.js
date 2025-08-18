// frontend/src/components/Register.js

import React, { useState } from 'react';
import authService from '../services/auth';
import '../styles/Form.css'; // Corrected CSS import path

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [successful, setSuccessful] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccessful(false);

    try {
      await authService.register(email, password);
      setMessage('Registration successful! You can now log in.');
      setSuccessful(true);
    } catch (error) {
      const resMessage =
        (error.response &&
          error.response.data &&
          error.response.data.detail) ||
        error.message ||
        error.toString();
      setMessage(resMessage);
      setSuccessful(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Create an Account
        </h2>
        <form className="space-y-6" onSubmit={handleRegister}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && (
            <div
              className={`p-3 text-sm rounded-md ${
                successful ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
              }`}
            >
              {message}
            </div>
          )}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
