/**
 * Login Page
 *
 * Public page for user authentication.
 * Includes link to registration page.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Login from '../components/auth/Login';

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AEO Platform</h1>
          <p className="text-gray-600">Answer Engine Optimization for your content</p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Login />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to AEO Platform?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our{' '}
            <button
              type="button"
              onClick={() => {}}
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => {}}
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
