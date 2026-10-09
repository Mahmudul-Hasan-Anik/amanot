/**
 * SMS Gateway Adapter for Bangladeshi SMS Providers
 * Supports Greenweb, Elitbuzz, SSL Wireless, and offline/demo logger.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhone, supabase, isSupabaseConfigured } from '../lib/supabase';
import { toBengaliDigits } from '../lib/money';

export type SmsProviderName = 'greenweb' | 'elitbuzz' | 'sslwireless' | 'mock';

export interface SmsLogItem {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  memberId?: string;
  templateType: string;
  message: string;
  provider: SmsProviderName;
  status: 'sent' | 'failed' | 'queued';
  timestamp: string;
  apiResponse?: any;
}

const SMS_STORAGE_KEY = 'amanot_sms_history_logs';

export interface SmsConfig {
  provider: SmsProviderName;
  senderId: string;
  clientId?: string; // for SSL Wireless
}

const DEFAULT_CONFIG: SmsConfig = {
  provider: (process.env.EXPO_PUBLIC_SMS_PROVIDER as SmsProviderName) || 'mock',
  senderId: process.env.EXPO_PUBLIC_SMS_SENDER_ID || 'Amanot',
  clientId: process.env.EXPO_PUBLIC_SMS_CLIENT_ID || '',
};

class SmsGatewayService {
  private config: SmsConfig = DEFAULT_CONFIG;

  public setConfig(custom: Partial<SmsConfig>) {
    this.config = { ...this.config, ...custom };
  }

  public getConfig(): SmsConfig {
    return { ...this.config };
  }

  /**
   * Templates for common somiti communication
   */
  public templates = {
    depositReceipt: (params: {
      name: string;
      amount: number;
      receiptNo: string;
      dueAmount?: number;
      somitiName?: string;
    }) => {
      const somiti = params.somitiName || 'আমানত সমিতি';
      const bnAmount = toBengaliDigits(params.amount);
      const dueText =
        params.dueAmount !== undefined && params.dueAmount > 0
          ? ` বর্তমান বকেয়া: ৳${toBengaliDigits(params.dueAmount)}।`
          : ' কোনো বকেয়া নেই।';
      return `আসসালামু আলাইকুম ${params.name}, ${somiti}-এ আপনার ৳${bnAmount} কিস্তি জমা গৃহীত হয়েছে (রসিদ: ${params.receiptNo})।${dueText} ধন্যবাদ।`;
    },

    overdueReminder: (params: {
      name: string;
      dueAmount: number;
      dueMonths: string;
      bkashNo?: string;
      somitiName?: string;
    }) => {
      const somiti = params.somitiName || 'আমানত সমিতি';
      const bnAmount = toBengaliDigits(params.dueAmount);
      const bkashText = params.bkashNo ? ` বিকাশ: ${params.bkashNo}।` : '';
      return `আসসালামু আলাইকুম ${params.name}, ${somiti}-এ আপনার ${params.dueMonths} মাসের ৳${bnAmount} বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন।${bkashText} ধন্যবাদ।`;
    },

    autoApprovalNotice: (params: {
      voucherNo: string;
      amount: number;
      category: string;
      somitiName?: string;
    }) => {
      const somiti = params.somitiName || 'আমানত সমিতি';
      const bnAmount = toBengaliDigits(params.amount);
      return `[নোটিশ] ${somiti}: ভাউচার #${params.voucherNo} (৳${bnAmount}, ${params.category}) স্বয়ংক্রিয়ভাবে অনুমোদিত হয়েছে।`;
    },

    profitDistributed: (params: {
      name: string;
      profitAmount: number;
      year: number;
      somitiName?: string;
    }) => {
      const somiti = params.somitiName || 'আমানত সমিতি';
      const bnProfit = toBengaliDigits(params.profitAmount);
      const bnYear = toBengaliDigits(params.year);
      return `মুবারকবাদ ${params.name}! ${somiti}-এর ${bnYear} সালের অর্জিত মুনাফা ৳${bnProfit} আপনার সঞ্চয় একাউন্টে যোগ করা হয়েছে।`;
    },
  };

  /**
   * Sends an SMS message to recipient phone
   */
  public async sendSms(params: {
    phone: string;
    message: string;
    templateType?: string;
    recipientName?: string;
    memberId?: string;
  }): Promise<{ success: boolean; log: SmsLogItem; error?: string }> {
    const normPhone = normalizePhone(params.phone);
    const logId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = new Date().toISOString();

    const logItem: SmsLogItem = {
      id: logId,
      recipientPhone: normPhone,
      recipientName: params.recipientName,
      memberId: params.memberId,
      templateType: params.templateType || 'custom',
      message: params.message,
      provider: this.config.provider,
      status: 'queued',
      timestamp,
    };

    try {
      if (isSupabaseConfigured()) {
        const {data,error} = await supabase.functions.invoke('send-sms',{body:params});
        if(error || !data?.success) throw new Error(data?.error || error?.message || 'SMS service unavailable');
        logItem.provider=data.provider;logItem.status=data.simulated?'queued':'sent';
        logItem.apiResponse={simulated:data.simulated};
      } else {
        logItem.provider='mock';logItem.status='queued';
        logItem.apiResponse={simulated:true};
      }

      await this.saveLog(logItem);
      return { success: true, log: logItem };
    } catch (err: any) {
      logItem.status = 'failed';
      logItem.apiResponse = { error: err?.message || String(err) };
      await this.saveLog(logItem);
      return { success: false, log: logItem, error: err?.message || String(err) };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  public async sendBulkSms(
    items: Array<{
      phone: string;
      message: string;
      templateType?: string;
      recipientName?: string;
      memberId?: string;
    }>
  ): Promise<{ sentCount: number; failedCount: number; logs: SmsLogItem[] }> {
    let sentCount = 0;
    let failedCount = 0;
    const logs: SmsLogItem[] = [];

    for (const item of items) {
      const res = await this.sendSms(item);
      logs.push(res.log);
      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    return { sentCount, failedCount, logs };
  }

  /**
   * Save log entry to AsyncStorage
   */
  private async saveLog(log: SmsLogItem): Promise<void> {
    try {
      const current = await this.getLogs();
      const updated = [log, ...current].slice(0, 100); // keep last 100
      await AsyncStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save SMS log:', e);
    }
  }

  /**
   * Retrieve historical SMS logs
   */
  public async getLogs(): Promise<SmsLogItem[]> {
    try {
      const raw = await AsyncStorage.getItem(SMS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear SMS history
   */
  public async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SMS_STORAGE_KEY);
    } catch {}
  }
}

export const smsGateway = new SmsGatewayService();
