import React, { useState } from 'react';
import { X, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { setAdminAuthState } from '../services/storage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === 'admin123' || pin.trim() === 'cloudnet2026' || pin.trim() === 'imd') {
      setAdminAuthState(true);
      setError('');
      setPin('');
      onLoginSuccess();
      onClose();
    } else {
      setError('Invalid PIN. Use default "admin123" for testing.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden p-6">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1.5 mb-5 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto border border-sky-200">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            IMD Officer Verification
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Enter PIN to authorize moderation actions.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="Enter PIN (admin123)"
              className="w-full glass-input px-3 py-2.5 rounded-xl text-sm font-mono text-center tracking-widest font-bold"
              autoFocus
            />
            {error ? (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center justify-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {error}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1.5 text-center font-mono">
                PIN: <strong className="text-sky-700 font-bold">admin123</strong>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            Authenticate Session
          </button>
        </form>

      </div>
    </div>
  );
};
