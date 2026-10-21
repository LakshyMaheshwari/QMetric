import React from 'react';
import { X, Shield, Lock, Crown } from 'lucide-react';

const AccessRestrictionModal = ({ 
  isOpen, 
  onClose, 
  onLogin, 
  featureName, 
  restrictionType = 'login', // 'login' or 'premium'
  user = null,
  customMessage = null,
  customIcon = null 
}) => {
  if (!isOpen) return null;

  const getRestrictionConfig = () => {
    switch (restrictionType) {
      case 'premium':
        return {
          icon: customIcon || Crown,
          iconBg: 'from-amber-500 to-orange-500',
          title: 'Premium Feature',
          message: customMessage || `${featureName} is available for Premium users only.`,
          buttonText: 'Upgrade to Premium',
          buttonAction: () => {
            console.log('Redirect to premium upgrade');
            onClose();
          }
        };
      case 'login':
      default:
        return {
          icon: customIcon || Shield,
          iconBg: 'from-orange-500 to-orange-600',
          title: 'Access Restricted',
          message: customMessage || `You need to be logged in to access ${featureName}.`,
          buttonText: 'Login to Continue',
          buttonAction: () => {
            onLogin();
            onClose();
          }
        };
    }
  };

  const config = getRestrictionConfig();
  const IconComponent = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate__animated animate__fadeIn animate__faster"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <div className="bg-white border border-[#E8E2D7] rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center">
          {/* Close button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="text-[#78716C] hover:text-[#111827] p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-16 h-16 bg-gradient-to-r ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm`}>
            <IconComponent className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-[#111827] mb-2">{config.title}</h2>

          {/* Message */}
          <p className="text-[#57534E] text-sm mb-6 leading-relaxed">{config.message}</p>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={config.buttonAction}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-sm transition-all"
            >
              {config.buttonText}
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-[#78716C] hover:text-[#111827] font-medium transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessRestrictionModal;