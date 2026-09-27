import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./components/pages/LandingPage";
import Components from "./components/Components";
import UploadPage from "./components/pages/UploadPage";
import Footer from "./components/Footer";
import ScrollToTop from './ScrollToTop';
import ResultPage from "./components/pages/ResultPage";
import "./App.css";
import "animate.css";
import UserDashboard from "./components/pages/UserDashboard";
import CreditsPage from "./components/pages/Creditspage";
import RegisterPage from "./components/pages/RegisterPage";
import ProfilePage from "./components/pages/ProfilePage";
import AdminDashboard from "./components/pages/AdminDashboard";
import CollegeAdminDashboard from "./components/pages/CollegeAdminDashboard";
import Colleges from "./components/SuperAdmin/Colleges";
import SuperAdminDashboard from "./components/pages/SuperAdminDashboard";
import CollegeDetailPage from "./components/pages/CollegeDetailPage";
import ReviewerDashboard from "./components/pages/ReviewerDashboard";
import TeacherDashboard from "./components/pages/TeacherDashboard";
import TeamPage from "./components/pages/TeamPage";
import AllPapersPage from './components/pages/AllPapersPage';
import NotFound from "./components/pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ensureCsrfToken } from "./api/client";


function App() {
  return (
    <AuthProvider>
      <div className="bg-black min-h-screen text-white">
        <Navbar />
        <ScrollToTop />
        <Routes>
          {/* Public Routes - NO guard */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/components" element={<Components />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected - Any authenticated user */}
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><UserDashboard /></ProtectedRoute>
          } />

          {/* Teacher-only routes */}
          <Route path="/upload" element={
            <ProtectedRoute requiredRole="teacher"><UploadPage /></ProtectedRoute>
          } />
          <Route path="/result/:paperId" element={
            <ProtectedRoute requiredRole={['teacher', 'reviewer', 'admin', 'super_admin']}><ResultPage /></ProtectedRoute>
          } />
          <Route path="/teacher" element={
            <ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>
          } />
          <Route path="/papers" element={
            <ProtectedRoute requiredRole="teacher"><AllPapersPage /></ProtectedRoute>
          } />

          {/* Reviewer-only routes */}
          <Route path="/reviewer" element={
            <ProtectedRoute requiredRole={['reviewer', 'admin']}><ReviewerDashboard /></ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/college-admin" element={
            <ProtectedRoute requiredRole="admin"><CollegeAdminDashboard /></ProtectedRoute>
          } />

          {/* Super Admin-only routes */}
          <Route path="/super-admin" element={
            <ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>
          } />
          <Route path="/super-admin/colleges" element={
            <ProtectedRoute requiredRole="super_admin"><Colleges /></ProtectedRoute>
          } />
          <Route path="/super-admin/colleges/:id" element={
            <ProtectedRoute requiredRole="super_admin"><CollegeDetailPage /></ProtectedRoute>
          } />

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
