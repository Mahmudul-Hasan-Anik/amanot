import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMembers, Member } from '../../mocks/mockData';
import { toEnglishDigits } from '../../lib/bengali';
import { Alert } from 'react-native';
import { isSupabaseConfigured, normalizePhone } from '../../lib/supabase';
import * as api from '../../lib/api';

const REMOTE = isSupabaseConfigured();

type ServerRole = 'super_admin' | 'admin' | 'cashier' | 'field_worker' | 'member';

const somiti = () => require('../../store/somitiStore').useSomitiStore.getState();

function stubMember(phone: string, initial?: string): Member {
  return {
    id: '', code: '', name: initial || 'আ', phone, address: '', nomineeName: '', nomineeRelation: '',
    joinDate: '', monthlyAmount: 0, totalDeposit: 0, dueAmount: 0, dueMonths: 0, status: 'paid',
  };
}

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

  // Supabase backend
  actualRole: ServerRole;          // role stored on the server
  phoneRegistered: boolean;        // account already activated?
  continueWithPhone: (rawPhone: string) => Promise<{ found: boolean; error?: string }>;
  loginWithPin: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  registerSomitiRemote: (somitiName: string, adminName: string, adminPhone: string, adminPin: string) => Promise<{ ok: boolean; error?: string }>;
  refreshProfile: () => Promise<boolean>;
  lockApp: () => void;

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

      actualRole: 'super_admin',
      phoneRegistered: false,

      continueWithPhone: async (rawPhone: string) => {
        const phone = normalizePhone(rawPhone);
        try {
          const r = await api.checkPhone(phone);
          if (!r.exists) return { found: false };
          set({ phone, phoneRegistered: r.registered, currentUser: stubMember(phone, r.initial), isAuthenticated: true, isPinVerified: false });
          return { found: true };
        } catch (e: any) {
          return { found: false, error: e?.message || String(e) };
        }
      },

      refreshProfile: async () => {
        const me = await api.fetchMyProfile();
        if (!me) return false;
        const role = me.profile.role as ServerRole;
        set({
          actualRole: role,
          userRole: role === 'member' ? 'member' : 'admin',
          currentUser: me.member || stubMember(me.profile.phone, me.profile.full_name),
          phone: me.profile.phone,
        });
        return true;
      },

      loginWithPin: async (rawPin: string) => {
        const pin = toEnglishDigits(rawPin.replace(/\D/g, ''));
        const phone = get().phone;
        try {
          if (get().phoneRegistered) {
            await api.signInWithPin(phone, pin);
          } else {
            // first login: activate the account with the PIN the admin gave
            await api.activateWithPin(phone, pin);
            set({ phoneRegistered: true });
          }
          const ok = await get().refreshProfile();
          if (!ok) throw new Error('প্রোফাইল পাওয়া যায়নি');
          set({ isAuthenticated: true, isPinVerified: true });
          somiti().syncFromServer();
          return { ok: true };
        } catch (e: any) {
          const msg = e?.message || String(e);
          return { ok: false, error: /invalid login/i.test(msg) ? 'পিন সঠিক নয়' : msg };
        }
      },

      registerSomitiRemote: async (somitiName, adminName, adminPhone, adminPin) => {
        const phone = normalizePhone(adminPhone);
        const pin = toEnglishDigits(adminPin.replace(/\D/g, ''));
        if (pin.length !== 4) return { ok: false, error: 'পিন ৪ সংখ্যার হতে হবে' };
        try {
          await api.bootstrapSomiti(somitiName.trim(), adminName.trim(), phone, pin);
          set({ phone, phoneRegistered: true });
          await get().refreshProfile();
          set({ isAuthenticated: true, isPinVerified: true });
          somiti().syncFromServer();
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e?.message || String(e) };
        }
      },

      lockApp: () => {
        if (REMOTE && get().isAuthenticated) set({ isPinVerified: false, phoneRegistered: true });
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
        if (REMOTE) return false; // use loginWithPin() with the backend
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
        if (REMOTE) {
          api.changeOwnPin(cleanPin).catch((e: any) => Alert.alert('পিন পরিবর্তন ব্যর্থ', e?.message || String(e)));
          return;
        }
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
        if (REMOTE) {
          api.resetMemberPin(memberId, '1234').catch((e: any) => Alert.alert('পিন রিসেট ব্যর্থ', e?.message || String(e)));
          return;
        }
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
        if (REMOTE) {
          // staff can preview the member view; members can never switch to admin
          if (role === 'admin' && get().actualRole === 'member') {
            Alert.alert('অনুমতি নেই', 'শুধু কমিটি সদস্যরা অ্যাডমিন ভিউ দেখতে পারবেন।');
            return;
          }
          set({ userRole: role });
          return;
        }
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
        if (REMOTE) {
          api.signOut().catch(() => {});
          somiti().clearLocalData();
          set({ currentUser: null, actualRole: 'member', userRole: 'member', phoneRegistered: false });
        }
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
