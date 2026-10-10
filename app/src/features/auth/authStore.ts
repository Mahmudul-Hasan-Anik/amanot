import { clearQueryCache } from '../../lib/queryCache';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMembers, Member } from '../../mocks/mockData';
import { toEnglishDigits } from '../../lib/bengali';
import { Alert } from 'react-native';
import { isSupabaseConfigured, normalizePhone } from '../../lib/supabase';
import * as api from '../../lib/api';
import { isStrongPin, normalizePin, generateTemporaryPin } from '../../lib/pinPolicy';
import { sessionStorage } from '../../lib/sessionStorage';
import { isValidPhone } from '../../lib/phoneAuth';
import { friendlyAuthError } from '../../lib/authErrors';

const REMOTE = isSupabaseConfigured();
let authRevision = 0;

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
  mustChangePin: boolean;
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
  setCustomPin: (newPin: string, currentPin?: string) => Promise<void>;
  setMemberPin: (memberId: string, newPin: string) => void;
  resetMemberPin: (memberId: string) => Promise<string>;
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
      currentUser: REMOTE ? null : mockMembers[0],
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

      actualRole: REMOTE ? 'member' : 'super_admin',
      phoneRegistered: false,
      mustChangePin: false,

      continueWithPhone: async (rawPhone: string) => {
        const phone = normalizePhone(rawPhone);
        if (!isValidPhone(phone)) return { found:false, error:'সঠিক মোবাইল নম্বর দিন।' };
        const revision=++authRevision;
        try {
          const r = await api.checkPhone(phone);
          if(revision!==authRevision)return {found:false,error:'লগইন বাতিল হয়েছে। আবার শুরু করুন।'};
          if (!r.exists) return { found: false };
          somiti().clearLocalData();
          set({ phone, phoneRegistered: r.registered, mustChangePin: false, actualRole:'member', userRole:'member', currentUser: stubMember(phone, r.initial), isAuthenticated: true, isPinVerified: false });
          return { found: true };
        } catch (e: any) {
          return { found: false, error: friendlyAuthError(e?.message || String(e)) };
        }
      },

      refreshProfile: async () => {
        const revision = authRevision;
        const me = await api.fetchMyProfile();
        if (!me || revision !== authRevision) return false;
        const role = me.profile.role as ServerRole;
        const previous = get();
        const changedAccount = !!previous.currentUser?.id && (
          (!!me.member?.id && previous.currentUser.id !== me.member.id) ||
          normalizePhone(previous.phone) !== normalizePhone(me.profile.phone)
        );
        if (changedAccount || previous.actualRole !== role) somiti().clearLocalData();
        set({
          ...(changedAccount ? { isPinVerified: false } : {}),
          actualRole: role,
          userRole: role === 'member' ? 'member' : 'admin',
          currentUser: me.member || stubMember(me.profile.phone, me.profile.full_name),
          phone: me.profile.phone,
          mustChangePin: me.profile.must_change_pin === true,
        });
        return true;
      },

      loginWithPin: async (rawPin: string) => {
        const pin = normalizePin(rawPin);
        const phone = normalizePhone(get().phone);
        if (!get().isAuthenticated || !isValidPhone(phone)) {
          get().logout();
          return { ok:false, error:'মোবাইল নম্বর দিয়ে আবার লগইন শুরু করুন।' };
        }
        if (!/^(\d{4}|\d{6})$/.test(pin)) return { ok: false, error: '৬ সংখ্যার পিন দিন; পুরোনো অ্যাকাউন্টে ৪ সংখ্যার পিন গ্রহণ করা হয়।' };
        const revision=++authRevision;
        set({ isPinVerified:false });
        try {
          // A registered account is authenticated by the server; no extra phone lookup is needed.
          const registration = get().phoneRegistered ? {exists:true,registered:true} : await api.checkPhone(phone);
          if (!registration.exists) throw new Error('নম্বরটি নিবন্ধিত নয়। সমিতির অ্যাডমিনের সাথে যোগাযোগ করুন।');
          if (revision!==authRevision || !get().isAuthenticated || normalizePhone(get().phone)!==phone) return {ok:false,error:'মোবাইল নম্বর দিয়ে আবার লগইন শুরু করুন।'};
          set({phoneRegistered:registration.registered});
          if (!registration.registered && !isStrongPin(pin)) return {ok:false,error:'প্রথম লগইনের জন্য অ্যাডমিনের দেওয়া নতুন ৬ সংখ্যার পিন নিন।'};
          const signedSession = registration.registered
            ? await api.signInWithPin(phone, pin)
            : await api.activateWithPin(phone, pin);
          if (revision!==authRevision || !get().isAuthenticated || normalizePhone(get().phone)!==phone) return {ok:false,error:'মোবাইল নম্বর দিয়ে আবার লগইন শুরু করুন।'};
          const me = await api.fetchMyProfile(signedSession?.user.id);
          if (revision!==authRevision || !get().isAuthenticated || normalizePhone(get().phone)!==phone) return {ok:false,error:'মোবাইল নম্বর দিয়ে আবার লগইন শুরু করুন।'};
          if (!me || normalizePhone(me.profile.phone)!==phone) throw new Error('অ্যাকাউন্টের তথ্য পাওয়া যায়নি। আবার লগইন করুন।');
          const role = me.profile.role as ServerRole;
          set({ isAuthenticated:true, isPinVerified:true, phoneRegistered:true, actualRole:role,
            userRole:role==='member'?'member':'admin', currentUser:me.member || stubMember(phone,me.profile.full_name),
            mustChangePin:me.profile.must_change_pin===true });
          if (!get().mustChangePin) somiti().syncFromServer();
          return { ok: true };
        } catch (e: any) {
          const msg = e?.message || String(e);
          return { ok: false, error: friendlyAuthError(msg) };
        }
      },

      registerSomitiRemote: async (somitiName, adminName, adminPhone, adminPin) => {
        if (somitiName.trim().length<2 || adminName.trim().length<2) return {ok:false,error:'সমিতি ও অ্যাডমিনের নাম কমপক্ষে ২ অক্ষরে লিখুন।'};
        const phone = normalizePhone(adminPhone);
        if (!isValidPhone(phone)) return {ok:false,error:'সঠিক মোবাইল নম্বর দিন।'};
        const pin = toEnglishDigits(adminPin).replace(/\D/g, '');
        if (!isStrongPin(pin)) return { ok: false, error: '৬ সংখ্যার পিন দিন; একই বা ধারাবাহিক সংখ্যা ব্যবহার করবেন না।' };
        const revision = ++authRevision;
        try {
          const existing = await api.checkPhone(phone);
          if (revision !== authRevision) return {ok:false,error:'নিবন্ধন বাতিল হয়েছে। আবার শুরু করুন।'};
          if (existing.exists) return {ok:false,error:'এই নম্বরটি ইতিমধ্যে একটি সমিতিতে আছে। লগইন করুন অথবা নতুন সমিতির জন্য আলাদা নম্বর দিন।'};
          await api.bootstrapSomiti(somitiName.trim(), adminName.trim(), phone, pin);
          if (revision !== authRevision) return {ok:false,error:'নিবন্ধন বাতিল হয়েছে। লগইন দিয়ে আবার শুরু করুন।'};
          somiti().clearLocalData();
          set({ phone, phoneRegistered: true });
          if (!await get().refreshProfile()) throw new Error('অ্যাকাউন্টের তথ্য পাওয়া যায়নি। আবার লগইন করুন।');
          if (revision !== authRevision) return {ok:false,error:'লগইন দিয়ে আবার শুরু করুন।'};
          set({ isAuthenticated: true, isPinVerified: true });
          somiti().syncFromServer();
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: friendlyAuthError(e?.message || String(e)) };
        }
      },

      lockApp: () => {
        if (REMOTE && get().isAuthenticated) { clearQueryCache(); set({ isPinVerified: false, phoneRegistered: true }); }
      },

      setPhone: (phone: string) => set({ phone }),

      requestOtp: (rawPhone: string) => {
        const cleanPhone = toEnglishDigits(rawPhone).replace(/\D/g, '');
        const otp = '482700';
        set({ phone: cleanPhone, lastGeneratedOtp: otp });
        return otp;
      },

      verifyOtp: (rawOtp: string) => {
        if (REMOTE) return false;
        const cleanOtp = toEnglishDigits(rawOtp).replace(/\D/g, '');
        if (cleanOtp === get().lastGeneratedOtp) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      verifyPin: (rawPin: string) => {
        if (REMOTE) return false; // use loginWithPin() with the backend
        const cleanPin = toEnglishDigits(rawPin).replace(/\D/g, '');
        const curr = get().currentUser;
        const memberPin = curr?.id ? get().customPins[curr.id] : undefined;
        const storedPin = toEnglishDigits(memberPin || get().pin || '1234');

        if (cleanPin === storedPin) {
          set({ isPinVerified: true });
          return true;
        }
        return false;
      },

      setCustomPin: async (newPin: string, currentPin = '') => {
        const cleanPin = toEnglishDigits(newPin).replace(/\D/g, '');
        if (REMOTE) {
          if (!isStrongPin(cleanPin)) throw new Error('নিরাপদ ৬ সংখ্যার পিন দিন।');
          await api.changeOwnPin(cleanPin, normalizePin(currentPin));
          get().logout();
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
        const cleanPin = toEnglishDigits(newPin).replace(/\D/g, '');
        set((state) => ({
          customPins: { ...state.customPins, [memberId]: cleanPin },
        }));
      },

      resetMemberPin: async (memberId: string) => {
        if (REMOTE) {
          const temporaryPin = generateTemporaryPin();
          await api.resetMemberPin(memberId, temporaryPin);
          return temporaryPin;
        }
        set((state) => ({
          customPins: { ...state.customPins, [memberId]: '1234' },
        }));
        return '1234';
      },

      loginAs: (memberId: string, role?: UserRole) => {
        if (REMOTE) return; // Demo shortcuts cannot authenticate a live account.
        const member = mockMembers.find((m) => m.id === memberId) || mockMembers[0];
        const determinedRole =
          role ||
          (member.role?.includes('সভাপতি') || member.role?.includes('অ্যাডমিন') || member.role?.includes('admin')
            ? 'admin'
            : 'member');

        set({
          currentUser: member,
          userRole: determinedRole,
          actualRole: determinedRole === 'member' ? 'member' : 'super_admin',
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
        const clean = toEnglishDigits(rawPhone).replace(/\D/g, '');
        const pool = membersPool && membersPool.length > 0 ? membersPool : mockMembers;

        const foundMember = pool.find((m) => {
          const mPhone = toEnglishDigits(m.phone).replace(/\D/g, '');
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
          set({ currentUser: foundMember, userRole: role, actualRole: isAdmin ? (foundMember.id==='1' ? 'super_admin' : 'admin') : 'member' });
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
        if (REMOTE) return;
        const cleanPhone = toEnglishDigits(adminPhone).replace(/\D/g, '');
        const cleanPin = toEnglishDigits(adminPin).replace(/\D/g, '');
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
        authRevision++;
        if (REMOTE) {
          api.signOut().catch(() => {});
          somiti().clearLocalData();
          set({ currentUser: null, actualRole: 'member', userRole: 'member', phoneRegistered: false });
        }
        set({
          isAuthenticated: false,
          isPinVerified: false,
          phone: '',
          mustChangePin:false,
        });
      },
    }),
    {
      name: REMOTE ? 'amanot-auth-live' : 'amanot-auth-storage',
      partialize: ({ isPinVerified, pin, customPins, lastGeneratedOtp, ...state }) => REMOTE ? { phone:state.phone, isAuthenticated:state.isAuthenticated, phoneRegistered:state.phoneRegistered } : { ...state, isPinVerified, pin, customPins, lastGeneratedOtp },
      storage: createJSONStorage(() => REMOTE ? sessionStorage : AsyncStorage),
    }
  )
);
