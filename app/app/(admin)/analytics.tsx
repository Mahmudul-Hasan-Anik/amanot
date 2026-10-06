import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { useSomitiStore } from '../../src/store/somitiStore';
import { recentMonths, inMonth } from '../../src/lib/months';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('6m');
  const { members, projects, transactions, cashAccounts, somitiInfo } = useSomitiStore();

  const SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SHORT_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const n = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const months = useMemo(() => recentMonths(n).reverse(), [n]);
  const thisYear = new Date().getFullYear();
  const active = useMemo(() => members.filter((m) => m.status !== 'inactive'), [members]);

  // % of active members who paid each month (months_status is kept for the current year)
  const collection = useMemo(
    () =>
      months.map((m) => {
        if (m.year !== thisYear || active.length === 0) return { ...m, pct: null as number | null };
        const eligible = active.filter((x: any) => {
          const j = x.joinDateISO as string | undefined;
          return !j || j.slice(0, 7) <= m.key;
        });
        if (!eligible.length) return { ...m, pct: null };
        const paid = eligible.filter((x) => x.monthsStatus?.[m.month] === 'paid').length;
        return { ...m, pct: Math.round((paid / eligible.length) * 100) };
      }),
    [months, active]
  );

  const flows = (key: string) => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((t: any) => {
      if (!inMonth(t.dateISO, key)) return;
      if (t.type === 'deposit' || t.type === 'profit') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    });
    return { inc, exp };
  };

  // Fund at the end of each month = today's fund minus what came in after it
  const cash = cashAccounts.reduce((a, c) => a + c.amount, 0);
  const invested = projects.reduce((a, p) => a + p.investedAmount, 0);
  const fundNow = cashAccounts.length ? cash + invested : somitiInfo.totalFund || 0;
  const fundSeries = useMemo(() => {
    const out: { key: string; month: number; value: number }[] = [];
    let running = fundNow;
    [...months].reverse().forEach((m) => {
      out.unshift({ key: m.key, month: m.month, value: Math.max(0, running) });
      const f = flows(m.key);
      running -= f.inc - f.exp;
    });
    return out;
  }, [months, transactions, fundNow]);
  const fundMax = Math.max(1, ...fundSeries.map((f) => f.value));
  const fundGrowthPct =
    fundSeries.length > 1 && fundSeries[0].value > 0
      ? Math.round(((fundSeries[fundSeries.length - 1].value - fundSeries[0].value) / fundSeries[0].value) * 100)
      : 0;

  const regular = active.filter((m) => m.dueMonths === 0).length;
  const occasional = active.filter((m) => m.dueMonths === 1).length;
  const chronic = active.filter((m) => m.dueMonths >= 2).length;

  const yearTx = transactions.filter((t: any) => (t.dateISO || '').startsWith(String(thisYear)));
  const yearIncome = yearTx.filter((t) => t.type === 'deposit' || t.type === 'profit').reduce((a, t) => a + t.amount, 0);
  const yearExpense = yearTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const expenseRatio = yearIncome > 0 ? Math.round((yearExpense / yearIncome) * 100) : 0;
  const totalDeposits = active.reduce((a, m) => a + m.totalDeposit, 0);
  const projectProfit = projects.reduce((a, p) => a + Math.max(0, p.netProfit), 0);
  const profitPer1000 = totalDeposits > 0 ? Math.round(((projectProfit - yearExpense) / totalDeposits) * 1000) : 0;

  const currentRate = collection[collection.length - 1]?.pct;
  const prevRates = collection.slice(0, -1).map((c) => c.pct).filter((x): x is number => x !== null).slice(-3);
  const avgPrev = prevRates.length ? Math.round(prevRates.reduce((a, b) => a + b, 0) / prevRates.length) : null;
  const idleShare = fundNow > 0 ? cash / fundNow : 0;
  const lossProjects = projects.filter((p) => p.status === 'delayed' || (p.roiPct < 0 && p.returnedAmount > 0));

  const shortLabel = (m: number) => l(SHORT_EN[m], SHORT_BN[m]);
  const lakh = (v: number) => {
    const x = (v / 100000).toFixed(1);
    return l(`${x}L`, `${formatNum(x)}ল`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Analytics', 'অ্যানালিটিক্স')}</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Selector Tabs */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, period === '3m' && styles.periodTabActive]}
            onPress={() => setPeriod('3m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '3m' && styles.periodTextActive]}>
              {l('3 Months', '৩ মাস')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === '6m' && styles.periodTabActive]}
            onPress={() => setPeriod('6m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '6m' && styles.periodTextActive]}>
              {l('6 Months', '৬ মাস')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === '1y' && styles.periodTabActive]}
            onPress={() => setPeriod('1y')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '1y' && styles.periodTextActive]}>
              {l('1 Year', '১ বছর')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: স্মার্ট সতর্কবার্তা */}
        <Text style={styles.sectionTitle}>{l('Smart Alerts', 'স্মার্ট সতর্কবার্তা')}</Text>

        {idleShare > 0.25 && (
          <View style={styles.idleCashAlert}>
            <Ionicons name="information-circle-outline" size={18} color="#1E293B" style={styles.alertIcon} />
            <Text style={styles.alertText}>
              <Text style={{ fontFamily: 'HindSiliguri-Bold' }}>{l('Idle Cash: ', 'অলস টাকা: ')}</Text>
              {formatMoney(cash)} {l(`(${Math.round(idleShare * 100)}% of the fund) is in hand & bank. Consider investing.`, `(তহবিলের ${formatNum(Math.round(idleShare * 100))}%) হাতে ও ব্যাংকে আছে। বিনিয়োগ বিবেচনা করুন।`)}
            </Text>
          </View>
        )}
        {lossProjects.map((p) => (
          <View key={p.id} style={styles.warningAlert}>
            <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.alertIcon} />
            <Text style={[styles.alertText, { color: '#9A3412' }]}>
              {p.status === 'delayed'
                ? l(`${p.name} is delayed.`, `${p.name} প্রজেক্ট বিলম্বিত।`)
                : l(`${p.name} ROI is negative (${p.roiPct}%).`, `${p.name} প্রজেক্টের ROI ঋণাত্মক (${formatNum(p.roiPct)}%)।`)}
            </Text>
          </View>
        ))}
        {currentRate !== null && currentRate !== undefined && avgPrev !== null && currentRate < avgPrev && (
          <View style={styles.warningAlert}>
            <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.alertIcon} />
            <Text style={[styles.alertText, { color: '#9A3412' }]}>
              {l(
                `Collection rate is ${currentRate}% this month, lower than the recent average of ${avgPrev}%.`,
                `আদায়ের হার এ মাসে ${formatNum(currentRate)}%, সাম্প্রতিক গড় ${formatNum(avgPrev)}% এর চেয়ে কম।`
              )}
            </Text>
          </View>
        )}
        {idleShare <= 0.25 && lossProjects.length === 0 && !(currentRate !== null && currentRate !== undefined && avgPrev !== null && currentRate < avgPrev) && (
          <View style={styles.idleCashAlert}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#0F766E" style={styles.alertIcon} />
            <Text style={styles.alertText}>{l('Everything looks fine.', 'সব কিছু ঠিক আছে।')}</Text>
          </View>
        )}

        {/* Card: মাসিক আদায়ের হার */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Monthly Collection Rate', 'মাসিক আদায়ের হার')}</Text>
          <Text style={styles.chartSub}>{l('Members who paid that month (current year)', 'ঐ মাসে জমা দেওয়া সদস্যের শতাংশ (চলতি বছর)')}</Text>
          <View style={styles.verticalBarsContainer}>
            {collection.map((c, i) => {
              const last = i === collection.length - 1;
              const low = c.pct !== null && c.pct < 80;
              const color = low ? '#C2410C' : '#0F766E';
              return (
                <View key={c.key} style={styles.barCol}>
                  <Text style={[styles.barValueText, low && { color }]}>{c.pct === null ? '—' : `${formatNum(c.pct)}%`}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${c.pct || 0}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barLabelText, last && { fontFamily: 'HindSiliguri-Bold' }]}>{shortLabel(c.month)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Card: তহবিলের বৃদ্ধি */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Fund Growth', 'তহবিলের বৃদ্ধি')}</Text>
          <Text style={styles.chartSub}>
            {l(`Total fund in Lakhs · ${fundGrowthPct >= 0 ? '+' : ''}${fundGrowthPct}% in this period`, `মোট তহবিল, লাখ টাকায় · এই সময়ে ${fundGrowthPct >= 0 ? '+' : ''}${formatNum(fundGrowthPct)}%`)}
          </Text>
          <View style={styles.verticalBarsContainer}>
            {fundSeries.map((f) => (
              <View key={f.key} style={styles.barCol}>
                <Text style={styles.barValueText}>{lakh(f.value)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${Math.round((f.value / fundMax) * 100)}%`, backgroundColor: '#0F766E' }]} />
                </View>
                <Text style={styles.barLabelText}>{shortLabel(f.month)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Card: সদস্যদের জমার অভ্যাস */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Members Deposit Habit', 'সদস্যদের জমার অভ্যাস')}</Text>
          <View style={styles.habitBar}>
            <View style={[styles.habitSegment, { flex: Math.max(regular, 0.001), backgroundColor: '#0F766E' }]} />
            <View style={[styles.habitSegment, { flex: Math.max(occasional, 0.001), backgroundColor: '#EA580C' }]} />
            <View style={[styles.habitSegment, { flex: Math.max(chronic, 0.001), backgroundColor: '#7C2D12' }]} />
          </View>
          <View style={styles.habitColsRow}>
            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>{l('No dues', 'বকেয়া নেই')}</Text>
              <Text style={styles.habitColValDark}>{formatNum(regular)} {l('Members', 'জন')}</Text>
            </View>
            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>{l('1 month due', '১ মাস বকেয়া')}</Text>
              <Text style={styles.habitColValOrange}>{formatNum(occasional)} {l('Members', 'জন')}</Text>
            </View>
            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>{l('2+ months due', '২+ মাস বকেয়া')}</Text>
              <Text style={styles.habitColValRust}>{formatNum(chronic)} {l('Members', 'জন')}</Text>
            </View>
          </View>
        </View>

        {/* Card: প্রজেক্টভিত্তিক ROI */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Project-wise ROI', 'প্রজেক্টভিত্তিক ROI')}</Text>
          <View style={styles.roiList}>
            {projects.length === 0 && <Text style={styles.chartSub}>{l('No projects yet', 'এখনো কোনো প্রজেক্ট নেই')}</Text>}
            {[...projects]
              .sort((a, b) => b.roiPct - a.roiPct)
              .map((p) => {
                const neg = p.roiPct < 0;
                const w = Math.min(100, Math.max(4, Math.abs(p.roiPct) * 4));
                return (
                  <View key={p.id} style={styles.roiItem}>
                    <View style={styles.roiHeader}>
                      <Text style={styles.roiName}>{p.name}</Text>
                      <Text style={[styles.roiVal, neg && { color: '#C2410C' }]}>
                        {neg ? '−' : ''}
                        {formatNum(Math.abs(p.roiPct))}%
                      </Text>
                    </View>
                    <View style={styles.roiTrack}>
                      <View style={[styles.roiFill, { width: `${w}%`, backgroundColor: neg ? '#C2410C' : '#0F766E' }]} />
                    </View>
                  </View>
                );
              })}
          </View>
        </View>

        {/* Bottom 2 Ratio Cards Row */}
        <View style={styles.twoRatiosRow}>
          <View style={styles.ratioCard}>
            <Text style={styles.ratioLabel}>{l('Operating Expense Ratio', 'পরিচালনা ব্যয়ের হার')}</Text>
            <Text style={styles.ratioVal}>{formatNum(expenseRatio)}%</Text>
            <Text style={styles.ratioSub}>{l('Relative to income this year', 'এ বছরের আয়ের তুলনায়')}</Text>
          </View>

          <View style={styles.ratioCard}>
            <Text style={styles.ratioLabel}>{l('Profit per ৳1,000 Deposit', 'প্রতি ৳১,০০০ জমায় লাভ')}</Text>
            <Text style={styles.ratioVal}>{formatMoney(profitPer1000)}</Text>
            <Text style={styles.ratioSub}>{l('This year, estimated', 'এ বছর, আনুমানিক')}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  periodTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#1E293B',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 10,
  },
  idleCashAlert: {
    flexDirection: 'row',
    backgroundColor: '#E8ECE6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  warningAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  chartSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  verticalBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barValueText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#1E293B',
  },
  barTrack: {
    width: 22,
    height: 80,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabelText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  habitBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  habitSegment: {
    height: '100%',
  },
  habitColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  habitCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  habitColLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  habitColValDark: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
    marginTop: 2,
  },
  habitColValOrange: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#EA580C',
    marginTop: 2,
  },
  habitColValRust: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#7C2D12',
    marginTop: 2,
  },
  roiList: {
    gap: 12,
    marginTop: 4,
  },
  roiItem: {
    gap: 4,
  },
  roiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roiName: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  roiVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
  roiTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  roiFill: {
    height: '100%',
  },
  twoRatiosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ratioCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  ratioLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  ratioVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 24,
    color: '#1E293B',
    marginVertical: 2,
  },
  ratioSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
});
