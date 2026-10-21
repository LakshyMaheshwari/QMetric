import React, { useState, useRef, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { FileText, Menu, X, User, Mail, Lock, Eye, EyeOff, Home, BarChart3, Users, Shield, Building2, Building, ClipboardCheck, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AccessRestrictionModal from './AccessRestrictionModal';
import useAccessRestriction from './hooks/useAccessRestriction';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const Navbar = () => {
  const { user, login: authLogin, logout: authLogout, blockedMessage, clearBlockedMessage } = useAuth();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const turnstileRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const navigate = useNavigate();

  // Use the access restriction hook
  const { restrictionModal, closeRestrictionModal, checkAccess } = useAccessRestriction(
    user,
    () => setIsLoginModalOpen(true)
  );

  // Scroll detection for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Open login modal when navigating to /login
  useEffect(() => {
    if (location.pathname === '/login' && !user) {
      setIsLoginModalOpen(true);
    }
  }, [location.pathname, user]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const navigateTo = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const scrollToSection = (sectionId) => {
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Feature access handler
  const handleFeatureAccess = (featureName, requiresPremium = false, path = null) => {
    const hasAccess = checkAccess({
      featureName,
      requiresLogin: true,
      requiresPremium
    });

    if (hasAccess) {
      if (path) {
        navigateTo(path);
      } else {
        console.log(`Accessing ${featureName}`);
      }
    }
  };

  // Get user initials
  const getUserInitials = (userName) => {
    if (!userName) return 'U';
    const names = userName.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const handleLogout = () => {
    authLogout();
    setShowUserMenu(false);
    navigateTo('/');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = turnstileRef.current?.getResponse() || turnstileToken;
    if (!token) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        turnstileToken: token
      });

      const data = response.data;
      authLogin(data.user);
      setIsLoginModalOpen(false);
      setFormData({ userName: '', email: '', password: '', confirmPassword: '' });
      turnstileRef.current?.reset();
      setTurnstileToken('');
      navigateTo('/');
    } catch (err) {
      turnstileRef.current?.reset();
      setTurnstileToken('');
      const message = err.response?.data?.message || err.message || 'Credentials not matched. Please try again';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    closeModal();
    navigateTo('/register');
  };

  const closeModal = () => {
    setIsLoginModalOpen(false);
    setFormData({ userName: '', email: '', password: '', confirmPassword: '' });
    setError('');
    turnstileRef.current?.reset();
    setTurnstileToken('');
  };

  const isActive = (path) => location.pathname === path;

  // Nav link style helper
  const navLinkClass = (path) =>
    `relative px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
      isActive(path)
        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
        : 'text-slate-700 hover:text-orange-600 hover:bg-orange-50'
    }`;

  return (
    <>
      {/* ────── NAVBAR ────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] border-b border-orange-100/60'
            : 'bg-white/60 backdrop-blur-lg border-b border-transparent'
        }`}
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer group"
              onClick={() => navigateTo('/')}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300 group-hover:scale-105">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-slate-800">Q</span>
                <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Metric</span>
              </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-1">
              <button onClick={() => navigateTo('/')} className={navLinkClass('/')}>
                Home
              </button>
              <button onClick={() => scrollToSection('features')} className="relative px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 text-slate-700 hover:text-orange-600 hover:bg-orange-50">
                Features
              </button>
              <button onClick={() => scrollToSection('about')} className="relative px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 text-slate-700 hover:text-orange-600 hover:bg-orange-50">
                About
              </button>
              <button onClick={() => navigateTo('/credits')} className={navLinkClass('/credits')}>
                Credits
              </button>
              <button onClick={() => navigateTo('/feedback')} className={navLinkClass('/feedback')}>
                Feedback
              </button>
            </div>

            {/* Login / Avatar - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-orange-200/70 bg-orange-50/50 hover:bg-orange-100/60 transition-all duration-300 group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
                      {getUserInitials(user.userName)}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 max-w-[100px] truncate">{user.userName}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-orange-100/80 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                      {/* User info header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100/60">
                        <p className="text-sm font-bold text-slate-800">{user.userName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {user.role && (
                            <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold uppercase tracking-wider">
                              {user.role}
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${user.isPremium ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {user.isPremium ? '★ Premium' : 'Free'}
                          </span>
                        </div>
                      </div>

                      <div className="p-1.5">
                        <MenuItem icon={<UserCircle className="w-4 h-4" />} onClick={() => { setShowUserMenu(false); navigateTo('/profile'); }}>
                          Profile
                        </MenuItem>
                        <MenuItem icon={<BarChart3 className="w-4 h-4" />} onClick={() => { setShowUserMenu(false); navigateTo('/dashboard'); }}>
                          Dashboard
                        </MenuItem>

                        {user.role === 'super_admin' && (
                          <MenuItem icon={<Building2 className="w-4 h-4" />} accent="blue" onClick={() => { setShowUserMenu(false); navigateTo('/super-admin'); }}>
                            Super Admin
                          </MenuItem>
                        )}
                        {user.role === 'admin' && (
                          <MenuItem icon={<Building className="w-4 h-4" />} accent="emerald" onClick={() => { setShowUserMenu(false); navigateTo('/college-admin'); }}>
                            College Dashboard
                          </MenuItem>
                        )}
                        {(user.role === 'reviewer' || user.role === 'admin') && (
                          <MenuItem icon={<ClipboardCheck className="w-4 h-4" />} accent="teal" onClick={() => { setShowUserMenu(false); navigateTo('/reviewer'); }}>
                            Review Papers
                          </MenuItem>
                        )}
                        {(user.role === 'teacher' || user.role === 'reviewer' || user.role === 'admin') && (
                          <MenuItem icon={<FileText className="w-4 h-4" />} accent="indigo" onClick={() => { setShowUserMenu(false); navigateTo('/teacher'); }}>
                            My Papers
                          </MenuItem>
                        )}

                        <div className="my-1 border-t border-orange-100/60"></div>

                        <MenuItem icon={<LogOut className="w-4 h-4" />} accent="red" onClick={handleLogout}>
                          Sign Out
                        </MenuItem>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm rounded-full shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-orange-50 transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-orange-100/60 shadow-lg">
            <div className="px-5 py-4 space-y-1">
              <MobileNavLink active={isActive('/')} onClick={() => navigateTo('/')}>Home</MobileNavLink>
              <MobileNavLink onClick={() => scrollToSection('features')}>Features</MobileNavLink>
              <MobileNavLink onClick={() => scrollToSection('about')}>About</MobileNavLink>
              <MobileNavLink active={isActive('/credits')} onClick={() => navigateTo('/credits')}>Credits</MobileNavLink>
              <MobileNavLink active={isActive('/feedback')} onClick={() => navigateTo('/feedback')}>Feedback</MobileNavLink>

              <div className="my-3 border-t border-orange-100/60"></div>

              {user ? (
                <div className="space-y-1">
                  <div className="px-3 py-2.5 bg-orange-50/80 rounded-xl mb-2">
                    <p className="text-sm font-bold text-slate-800">{user.userName}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <MobileNavLink onClick={() => navigateTo('/profile')}>Profile</MobileNavLink>
                  <MobileNavLink onClick={() => navigateTo('/dashboard')}>Dashboard</MobileNavLink>
                  {user.role === 'super_admin' && <MobileNavLink onClick={() => navigateTo('/super-admin')}>Super Admin</MobileNavLink>}
                  {user.role === 'admin' && <MobileNavLink onClick={() => navigateTo('/college-admin')}>College Dashboard</MobileNavLink>}
                  {(user.role === 'reviewer' || user.role === 'admin') && <MobileNavLink onClick={() => navigateTo('/reviewer')}>Review Papers</MobileNavLink>}
                  {(user.role === 'teacher' || user.role === 'reviewer' || user.role === 'admin') && <MobileNavLink onClick={() => navigateTo('/teacher')}>My Papers</MobileNavLink>}
                  <div className="my-2 border-t border-orange-100/60"></div>
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/20"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16"></div>

      {/* Access Restriction Modal */}
      <AccessRestrictionModal
        isOpen={restrictionModal.isOpen}
        onClose={closeRestrictionModal}
        onLogin={() => setIsLoginModalOpen(true)}
        featureName={restrictionModal.featureName}
        restrictionType={restrictionModal.restrictionType}
        user={user}
        customMessage={restrictionModal.customMessage}
        customIcon={restrictionModal.customIcon}
      />

      {/* ────── LOGIN MODAL ────── */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="bg-white border border-orange-100 rounded-3xl p-8 w-full max-w-md mx-4 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">
                  {isRegisterMode ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isRegisterMode ? 'Start your quality journey' : 'Sign in to your account'}
                </p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full hover:bg-orange-50 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {isRegisterMode && (
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    placeholder="Username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {isRegisterMode && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm Password"
                    required={isRegisterMode}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>
              )}

              {/* Cloudflare Turnstile CAPTCHA */}
              <div className="flex justify-center my-3">
                <Turnstile
                  id="navbar-login-turnstile"
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => {
                    console.log('[Turnstile/LoginModal] verified');
                    setTurnstileToken(token);
                    if (error) setError('');
                  }}
                  onExpire={() => {
                    console.log('[Turnstile/LoginModal] expired');
                    setTurnstileToken('');
                  }}
                  onError={(err) => {
                    console.error('[Turnstile/LoginModal] error:', err);
                    setTurnstileToken('');
                    setError('CAPTCHA verification failed. Please try again.');
                  }}
                  options={{ theme: 'light', size: 'normal' }}
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !turnstileToken}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Signing in...
                  </span>
                ) : (
                  isRegisterMode ? 'Create Account' : 'Sign In'
                )}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
                <button type="button" onClick={toggleMode} className="ml-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                  {isRegisterMode ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ────── BLOCKED ACCOUNT MODAL ────── */}
      {blockedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="bg-white border border-red-200 rounded-3xl p-8 w-full max-w-md shadow-[0_24px_80px_rgba(0,0,0,0.15)]"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Account Blocked</h3>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                {blockedMessage}
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-6 text-left">
                <p className="text-xs text-red-600">
                  Your access has been restricted by an administrator. Please contact your institution administrator or support for assistance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearBlockedMessage();
                  navigateTo('/');
                }}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/35 transition-all duration-300"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Small helper components ───────────────────────────

const MenuItem = ({ icon, children, onClick, accent = 'slate' }) => {
  const accentColors = {
    slate: 'text-slate-600 hover:bg-orange-50 hover:text-orange-700',
    blue: 'text-blue-600 hover:bg-blue-50',
    emerald: 'text-emerald-600 hover:bg-emerald-50',
    teal: 'text-teal-600 hover:bg-teal-50',
    indigo: 'text-indigo-600 hover:bg-indigo-50',
    red: 'text-red-500 hover:bg-red-50',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${accentColors[accent]}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

const MobileNavLink = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
      active
        ? 'bg-orange-500 text-white shadow-sm'
        : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600'
    }`}
  >
    {children}
  </button>
);

export default Navbar;