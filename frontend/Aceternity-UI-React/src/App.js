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
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <div className="bg-black min-h-screen text-white">
        <Navbar />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/components" element={<Components />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/college-admin" element={<CollegeAdminDashboard />} />
          <Route path="/super-admin/colleges" element={<Colleges />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/colleges/:id" element={<CollegeDetailPage />} />
          <Route path="/reviewer" element={<ReviewerDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Routes>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
