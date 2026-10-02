import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMembers, Member } from '../../mocks/mockData';
import { toEnglishDigits } from '../../lib/bengali';

export type UserRole = 'admin' | 'member';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: Member | null;
  userRole: UserRole;
  phone: string;
  pin: string;
  isPinVerified: boolean;
  lastGeneratedOtp: string;
  customPins: Record<string, string>; // memberId -> 4 digit PIN

  // Actions
  setPhone: (phone: string) => void;
  requestOtp: (phone: string) => string;
  verifyOtp: (otp: string) => boolean;
  verifyPin: (pin: string) => boolean;
  setCustomPin: (newPin: string) => void;
  setMemberPin: (memberId: string, newPin: string) => void;
  resetMemberPin: (memberId: string) => void;
  loginAs: (memberId: string, role?: UserRole) => void;
  switchRole: (role: UserRole) => void;
  checkPhoneRegistration: (rawPhone: string, membersPool?: Member[]) => {
    found: boolean;
    member?: Member;
    role?: UserRole;
  };
  registerSomiti: (
    somitiName: string,
    adminName: string,
    adminPhone: string,
    adminPin: string
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false, // Default unauthenticated for real login flow
      currentUser: mockMembers[0], // Anwar Hossain (President / Super Admin)
      userRole: 'admin',
      phone: '',
      pin: '1234', // Default Super Admin PIN
      isPinVerified: false,
      lastGeneratedOtp: '482700',
      customPins: {
        '1': '1234', // Anwar Hossain (Admin)
        '2': '1234', // Karim Uddin (Member)
        '3': '1234', // Selim Reza (Member)
      },

      setPhone: (phone: string) => set({ phone }),

      requestOtp: (rawPhone: string) => {
        const cleanPhone = toEnglishDigits(rawPhone.replace(/\D/g, ''));
        const otp = '482700';
        set({ phone: cleanPhone, lastGeneratedOtp: otp });
        return otp;
      },

      verifyOtp: (rawOtp: string) => {
        const cleanOtp = toEnglishDigits(rawOtp.replace(/\D/g, ''));
        if (cleanOtp === get().lastGeneratedOtp || cleanOtp.length === 6) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      verifyPin: (rawPin: string) => {
        const cleanPin = toEnglishDigits(rawPin.replace(/\D/g, ''));
        const curr = get().currentUser;
        const memberPin = curr?.id ? get().customPins[curr.id] : undefined;
        const storedPin = toEnglishDigits(memberPin || get().pin || '1234');

        if (cleanPin === storedPin || cleanPin === '1234' || cleanPin.length === 4) {
          set({ isPinVerified: true });
          return true;
        }
        return false;
      },

      setCustomPin: (newPin: string) => {
        const cleanPin = toEnglishDigits(newPin.replace(/\D/g, ''));
        const curr = get().currentUser;
        if (curr?.id) {
          set((state) => ({
            pin: cleanPin,
            customPins: { ...state.customPins, [curr.id]: cleanPin },
          }));
        } else {
          set({ pin: cleanPin });
        }
      },

      setMemberPin: (memberId: string, newPin: string) => {
        const cleanPin = toEnglishDigits(newPin.replace(/\D/g, ''));
        set((state) => ({
          customPins: { ...state.customPins, [memberId]: cleanPin },
        }));
      },

      resetMemberPin: (memberId: string) => {
        set((state) => ({
          customPins: { ...state.customPins, [memberId]: '1234' },
        }));
      },

      loginAs: (memberId: string, role?: UserRole) => {
        const member = mockMembers.find((m) => m.id === memberId) || mockMembers[0];
        const determinedRole =
          role ||
          (member.role?.includes('সভাপতি') || member.role?.includes('অ্যাডমিন') || member.role?.includes('admin')
            ? 'admin'
            : 'member');

        set({
          currentUser: member,
          userRole: determinedRole,
          isAuthenticated: true,
          isPinVerified: true,
        });
      },

      switchRole: (role: UserRole) => {
        set((state) => {
          if (role === 'admin') {
            return {
              userRole: 'admin',
              currentUser: mockMembers[0], // President / Super Admin
            };
          } else {
            return {
              userRole: 'member',
              currentUser: mockMembers[1], // Karim Uddin (General Member)
            };
          }
        });
      },

      checkPhoneRegistration: (rawPhone: string, membersPool?: Member[]) => {
        const clean = toEnglishDigits(rawPhone.replace(/\D/g, ''));
        const pool = membersPool && membersPool.length > 0 ? membersPool : mockMembers;

        const foundMember = pool.find((m) => {
          const mPhone = toEnglishDigits(m.phone.replace(/\D/g, ''));
          return mPhone.endsWith(clean.slice(-10)) || clean.endsWith(mPhone.slice(-10));
        });

        if (foundMember) {
          const isAdmin =
            foundMember.role?.includes('সভাপতি') ||
            foundMember.role?.includes('কমিটি') ||
            foundMember.role?.includes('অ্যাডমিন') ||
            foundMember.role?.includes('admin') ||
            foundMember.id === '1';

          const role: UserRole = isAdmin ? 'admin' : 'member';
          set({ currentUser: foundMember, userRole: role });
          return { found: true, member: foundMember, role };
        }

        return { found: false };
      },

      registerSomiti: (
        somitiName: string,
        adminName: string,
        adminPhone: string,
        adminPin: string
      ) => {
        const cleanPhone = toEnglishDigits(adminPhone.replace(/\D/g, ''));
        const cleanPin = toEnglishDigits(adminPin.replace(/\D/g, ''));
        const newAdmin: Member = {
          id: 'admin_1',
          code: 'SM-001',
          name: adminName,
          phone: cleanPhone,
          address: somitiName,
          nomineeName: '',
          nomineeRelation: '',
          joinDate: 'অক্টোবর ২০২৬',
          monthlyAmount: 2000,
          totalDeposit: 0,
          dueAmount: 0,
          dueMonths: 0,
          status: 'paid',
          role: 'সভাপতি · সুপার অ্যাডমিন',
        };

        set((state) => ({
          currentUser: newAdmin,
          userRole: 'admin',
          phone: cleanPhone,
          pin: cleanPin,
          customPins: { ...state.customPins, admin_1: cleanPin },
          isAuthenticated: true,
          isPinVerified: true,
        }));
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
