import { create } from 'zustand';
import { mockMembers, Member } from '../../mocks/mockData';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: Member | null;
  phone: string;
  pin: string;
  isPinVerified: boolean;
  
  // Actions
  setPhone: (phone: string) => void;
  verifyOtp: (otp: string) => boolean;
  verifyPin: (pin: string) => boolean;
  loginAs: (memberId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: true, // Set to true by default for direct screen testing
  currentUser: mockMembers[0], // Anwar Hossain (President / Super Admin)
  phone: '+৮৮০ ১৭১২ ৩৪৫৬৭৮',
  pin: '১২৩৪',
  isPinVerified: true,

  setPhone: (phone: string) => set({ phone }),

  verifyOtp: (otp: string) => {
    if (otp === '৪৮২৭০০' || otp.length === 6) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },

  verifyPin: (enteredPin: string) => {
    // Allows 1234 or any 4-digit PIN for demo test
    if (enteredPin.length === 4) {
      set({ isPinVerified: true });
      return true;
    }
    return false;
  },

  loginAs: (memberId: string) => {
    const member = mockMembers.find(m => m.id === memberId) || mockMembers[0];
    set({ currentUser: member, isAuthenticated: true, isPinVerified: true });
  },

  logout: () => {
    set({ isAuthenticated: false, isPinVerified: false, currentUser: null });
  },
}));
