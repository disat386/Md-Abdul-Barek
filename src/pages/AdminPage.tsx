import React from 'react';
import { AdminDashboard } from '../components/AdminDashboard';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Since AdminDashboard expects an onClose prop and manages its own layout, 
          we can just wrap it. In the future, we'll refactor AdminDashboard to be more "page-like".
      */}
      <AdminDashboard onClose={() => navigate('/')} />
    </div>
  );
}
