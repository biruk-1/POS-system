import React from 'react';
import { Link } from 'react-router-dom';

const OfflinePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            You are offline
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Don't worry! You can still use the POS system offline.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Limited functionality
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Some features may be limited while offline. Your data will be synced when you're back online.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Link
              to="/"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try to reconnect
            </Link>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh page
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>
            If you continue to experience issues, please check your internet connection or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage; 