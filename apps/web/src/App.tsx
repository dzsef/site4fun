import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ContractorHub from './pages/ContractorHub';
import ContractorCrew from './pages/ContractorCrew';
import Messages from './pages/Messages';
import Footer from './components/Footer';
import ProfileSidebar from './components/ProfileSidebar';

const AppShell: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contractor" element={<ContractorHub />} />
          <Route path="/contractor/crew" element={<ContractorCrew />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
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
