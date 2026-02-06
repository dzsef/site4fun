import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ContractorHub from './pages/ContractorHub';
import ContractorCrew from './pages/ContractorCrew';
import ContractorJobPosting from './pages/ContractorJobPosting';
import ContractorPostingsDashboard from './pages/ContractorPostingsDashboard';
import Messages from './pages/Messages';
import VerifyEmail from './pages/VerifyEmail';
import Academy from './pages/Academy';
import SubcontractorMarketplace from './pages/SubcontractorMarketplace';
import Footer from './components/Footer';
import ProfileSidebar from './components/ProfileSidebar';

const ContractorEntry: React.FC = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <ContractorHub />;
};

const AppShell: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/contractor" element={<ContractorEntry />} />
          <Route path="/contractor/crew" element={<ContractorCrew />} />
          <Route path="/contractor/postings" element={<ContractorPostingsDashboard />} />
          <Route path="/contractor/job-postings/new" element={<ContractorJobPosting />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/subcontractor/marketplace" element={<SubcontractorMarketplace />} />
          <Route path="/jobs" element={<Navigate to="/subcontractor/marketplace" replace />} />
          <Route path="/subcontractor" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ProfileSidebar />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
};

export default App;
