import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Chatbot from './components/Chatbot';
import PolicyDashboard from './components/PolicyDashboard';

function HomePage() {
  return (
    <main className="flex-grow container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800">Welcome to Your Client Portal</h1>
      <p className="mt-2 text-gray-600">Here you can view your policies, request changes, and more.</p>
    </main>
  );
}

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-100" style={{ backgroundColor: 'lightblue' }}>
        {/* Header */}
        <header className="bg-white shadow">
          <nav className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold text-gray-700">
                <Link to="/" className="text-gray-800 hover:text-gray-700">ReduceMyInsurance.Net</Link>
              </div>
              <div>
                <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200">Login</Link>
                <Link to="/dashboard" className="ml-4 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200">Dashboard</Link>
              </div>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<PolicyDashboard />} />
        </Routes>

        {/* Footer */}
        <footer className="bg-white">
          <div className="container mx-auto px-6 py-4">
            <p className="text-center text-sm text-gray-500">
              © 2025 ReduceMyinsurance.Net. All rights reserved.
            </p>
          </div>
        </footer>

        {/* Chatbot */}
        <Chatbot />
      </div>
    </Router>
  );
}

export default App;
