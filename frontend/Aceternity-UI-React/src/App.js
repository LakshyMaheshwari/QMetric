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
import FeedbackPage from "./components/pages/FeedbackPage";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    // AuthProvider makes useAuth() available to all pages and components
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
          {/* Feedback — auth-guarded page */}
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
