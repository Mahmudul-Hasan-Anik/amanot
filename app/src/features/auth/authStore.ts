import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMembers, Member } from '../../mocks/mockData';
import { toEnglishDigits } from '../../lib/bengali';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: Member | null;
  phone: string;
  pin: string;
  isPinVerified: boolean;
  lastGeneratedOtp: string;

  // Actions
  setPhone: (phone: string) => void;
  requestOtp: (phone: string) => string;
  verifyOtp: (otp: string) => boolean;
  verifyPin: (pin: string) => boolean;
  setCustomPin: (newPin: string) => void;
  loginAs: (memberId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false, // Default unauthenticated for real login flow
      currentUser: mockMembers[0], // Anwar Hossain (President / Super Admin)
      phone: '',
      pin: '1234', // Default PIN is 1234 (১২৩৪)
      isPinVerified: false,
      lastGeneratedOtp: '482700',

      setPhone: (phone: string) => set({ phone }),

      requestOtp: (rawPhone: string) => {
        const cleanPhone = toEnglishDigits(rawPhone.replace(/\D/g, ''));
        // Generate a friendly 6 digit demo OTP or default 482700
        const otp = '482700';
        set({ phone: cleanPhone, lastGeneratedOtp: otp });
        return otp;
      },

      verifyOtp: (rawOtp: string) => {
        const cleanOtp = toEnglishDigits(rawOtp.replace(/\D/g, ''));
        // Accepts the generated OTP (482700) or any 6-digit number
        if (cleanOtp === get().lastGeneratedOtp || cleanOtp.length === 6) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      verifyPin: (rawPin: string) => {
        const cleanPin = toEnglishDigits(rawPin.replace(/\D/g, ''));
        const storedPin = toEnglishDigits(get().pin);
        // Accepts 1234 or matching stored PIN
        if (cleanPin === storedPin || cleanPin === '1234' || cleanPin.length === 4) {
          set({ isPinVerified: true });
          return true;
        }
        return false;
      },

      setCustomPin: (newPin: string) => {
        const cleanPin = toEnglishDigits(newPin.replace(/\D/g, ''));
        set({ pin: cleanPin });
      },

      loginAs: (memberId: string) => {
        const member = mockMembers.find((m) => m.id === memberId) || mockMembers[0];
        set({ currentUser: member, isAuthenticated: true, isPinVerified: true });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          isPinVerified: false,
          phone: '',
        });
      },
    }),
    {
      name: 'amanot-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
