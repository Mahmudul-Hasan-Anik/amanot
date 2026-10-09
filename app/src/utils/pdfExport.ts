/**
 * PDF Export & Instant Document Sharing Utility
 * Generates official Bengali/English vouchers and statements
 * Supports expo-print and expo-sharing on native, and print/download on web.
 */
import { Platform, Linking, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toBengaliDigits, formatSouthAsianNumber } from '../lib/money';

export interface DepositReceiptData {
  receiptNo: string;
  memberName: string;
  memberCode: string;
  memberPhone?: string;
  amount: number;
  date: string;
  paymentMethod: string;
  months?: string[];
  lateFee?: number;
  dueAmount?: number;
  trxId?: string;
  somitiName?: string;
  somitiReg?: string;
  somitiPhone?: string;
}

export interface ProfitDistributionData {
  year: number;
  memberName: string;
  memberCode: string;
  totalDeposit: number;
  profitRate?: string;
  profitAmount: number;
  somitiName?: string;
  somitiReg?: string;
}

export interface FinancialStatementData {
  somitiName: string;
  period: string;
  totalFund: number;
  totalIncome: number;
  totalExpense: number;
  netReserve: number;
  cashBalance: number;
  bankBalance: number;
  bkashBalance?: number;
}

/**
 * HTML Template for Official Money Receipt / Deposit Voucher
 */
export function buildDepositReceiptHtml(data: DepositReceiptData): string {
  const somiti = data.somitiName || 'আমানত সঞ্চয় ও ঋণদান সমবায় সমিতি';
  const reg = data.somitiReg ? `রেজিঃ নং ${data.somitiReg}` : 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত';
  const bnAmount = toBengaliDigits(data.amount);
  const bnLateFee = data.lateFee ? toBengaliDigits(data.lateFee) : '০';
  const bnDue = data.dueAmount !== undefined ? toBengaliDigits(data.dueAmount) : '০';
  const methodLabel =
    data.paymentMethod === 'bkash'
      ? 'বিকাশ'
      : data.paymentMethod === 'nagad'
      ? 'নগদ'
      : data.paymentMethod === 'bank'
      ? 'ব্যাংক ট্রান্সফার'
      : 'হাতে নগদ';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>মানি রিসিট #${data.receiptNo}</title>
  <style>
    body {
      font-family: 'Hind Siliguri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1C1C1C;
      background-color: #ffffff;
    }
    .receipt-box {
      border: 2px solid #0F5E4A;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #D6D1C4;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      color: #0F5E4A;
      font-size: 24px;
    }
    .header p {
      margin: 4px 0 0;
      color: #6B6B6B;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      background-color: #0F5E4A;
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .label {
      color: #6B6B6B;
    }
    .value {
      font-weight: bold;
      color: #1C1C1C;
    }
    .amount-box {
      background-color: #D9EBE3;
      border: 1px solid #0F5E4A;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin: 20px 0;
    }
    .amount-title {
      color: #0F5E4A;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .amount-number {
      font-size: 32px;
      font-weight: 900;
      color: #0F5E4A;
      margin-top: 4px;
    }
    .footer-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
    }
    .signature-line {
      width: 140px;
      border-top: 1px solid #1C1C1C;
      text-align: center;
      font-size: 12px;
      color: #6B6B6B;
      padding-top: 4px;
    }
    .watermark {
      text-align: center;
      font-size: 11px;
      color: #9E9E9E;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <h1>${somiti}</h1>
      <p>${reg}</p>
      <div class="badge">অফিসিয়াল মানি রিসিট</div>
    </div>

    <div class="info-row">
      <div><span class="label">রসিদ নং:</span> <span class="value">#${data.receiptNo}</span></div>
      <div><span class="label">তারিখ:</span> <span class="value">${data.date}</span></div>
    </div>

    <div class="info-row">
      <div><span class="label">সদস্যের নাম:</span> <span class="value">${data.memberName}</span></div>
      <div><span class="label">সদস্য আইডি:</span> <span class="value">${data.memberCode}</span></div>
    </div>

    ${data.memberPhone ? `
    <div class="info-row">
      <div><span class="label">মোবাইল:</span> <span class="value">${data.memberPhone}</span></div>
      <div><span class="label">পদ্ধতি:</span> <span class="value">${methodLabel}</span></div>
    </div>` : `
    <div class="info-row">
      <div><span class="label">পদ্ধতি:</span> <span class="value">${methodLabel}</span></div>
      <div><span class="label">ট্রানজ্যাকশন আইডি:</span> <span class="value">${data.trxId || 'N/A'}</span></div>
    </div>`}

    ${data.months && data.months.length > 0 ? `
    <div class="info-row">
      <div><span class="label">পরিশোধিত মাস:</span> <span class="value">${data.months.join(', ')}</span></div>
      <div><span class="label">বিলম্ব ফি:</span> <span class="value">৳${bnLateFee}</span></div>
    </div>` : ''}

    <div class="amount-box">
      <div class="amount-title">জমার মোট পরিমাণ</div>
      <div class="amount-number">৳${bnAmount}</div>
    </div>

    <div class="info-row">
      <div><span class="label">অবশিষ্ট বকেয়া:</span> <span class="value">৳${bnDue}</span></div>
      <div><span class="label">স্ট্যাটাস:</span> <span class="value" style="color: #0F5E4A;">পরিশোধিত ✓</span></div>
    </div>

    <div class="footer-signatures">
      <div class="signature-line">সদস্যের স্বাক্ষর</div>
      <div class="signature-line">কোষাধ্যক্ষ / অনুমোদিত স্বাক্ষর</div>
    </div>

    <div class="watermark">
      আমানত অ্যাপ দ্বারা প্রস্তুতকৃত ডিজিটাল ভাউচার • এটি একটি বৈধ কম্পিউটারাইজড রসিদ
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF and trigger native share or web print dialog
 */
export async function exportAndShareReceipt(data: DepositReceiptData): Promise<void> {
  const html = buildDepositReceiptHtml(data);

  if (Platform.OS === 'web') {
    // Open in print-friendly window
    if (typeof window !== 'undefined') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 300);
      }
    }
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `আমানত রসিদ #${data.receiptNo}`,
      });
    } else {
      Alert.alert('PDF প্রস্তুত', `ফাইল সংরক্ষণ করা হয়েছে: ${uri}`);
    }
  } catch (error: any) {
    Alert.alert('PDF ত্রুটি', error?.message || 'রসিদ তৈরি করা সম্ভব হয়নি');
  }
}

/**
 * Share receipt details directly to WhatsApp
 */
export async function shareReceiptViaWhatsApp(
  phone: string,
  data: DepositReceiptData
): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
  const bnAmount = toBengaliDigits(data.amount);
  const somiti = data.somitiName || 'আমানত সমিতি';

  const message = `*${somiti} - মানি রিসিট*\n\nরসিদ নং: #${data.receiptNo}\nসদস্য: ${data.memberName} (${data.memberCode})\nতারিখ: ${data.date}\nজমা: ৳${bnAmount}\nপদ্ধতি: ${data.paymentMethod}\n\nআপনার সঞ্চয় সফলভাবে জমা হয়েছে। ধন্যবাদ।`;

  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp পাওয়া যায়নি', 'আপনার ডিভাইসে WhatsApp ইনস্টল করা নেই।');
    }
  } catch {
    await Linking.openURL(url);
  }
}
