/**
 * Amanot Somiti App - Canonical Design Tokens & Color Palette
 * Source of Truth: design/somiti-design.pdf (24 Mobile Screens)
 */

export const colors = {
  // Canonical Design Tokens
  primary: '#0F5E4A',         // Deep green (buttons, FAB, active states, progress fill)
  primarySoft: '#D9EBE3',     // Mint (selected chips, success badges, active nav pill)
  bg: '#F5F2EC',              // Warm cream screen canvas
  surface: '#FFFFFF',         // Crisp white cards
  surfaceMuted: '#ECE8DF',    // Beige (segmented track, info notes, disabled input, icon tiles)
  border: '#D6D1C4',          // Warm border (inputs, outlined buttons, unselected chips)
  warningSoft: '#FBE6DA',     // Peach (overdue cards, warning banners, overdue badges)
  warning: '#B5471B',         // Rust (overdue text, high-risk label, negative ROI)
  text: '#1C1C1C',            // Near-black (titles, amounts, body text)
  textSecondary: '#6B6B6B',   // Gray (subtitles, meta dates, field labels)

  // Screen 10 Aging Bar Palette (Exact sampled hex from PDF)
  aging: {
    month1: '#E99F6E',        // 1 মাস = Light warm orange
    month2: '#B5471B',        // 2 মাস = Rust warning
    month3Plus: '#792E07',    // 3+ মাস = Darker rust-brown / mahogany
  },

  // WhatsApp / Reminder Preview (Visibly mint-tinted, distinct from bg)
  previewContainer: '#E8F3EE', // Mint-tinted preview background
  previewBubble: '#FFFFFF',    // Crisp white chat bubble

  // Chart Palette (Primary green spectrum + neutral beige)
  chart: {
    segment1: '#0F5E4A',      // Darkest primary green (সাইট এ)
    segment2: '#167A62',      // Medium-deep green (দোকান)
    segment3: '#2D9A7E',      // Vibrant green (পোল্ট্রি)
    segment4: '#62BEA7',      // Light mint-green (সাইট বি)
    idle: '#D6D1C4',          // Warm neutral gray-beige (অলস টাকা)
    negative: '#B5471B',      // Rust for negative ROI
  },

  // Pastels for Avatars (Page 4, 5, 20, 23)
  avatarPastels: [
    { bg: '#D9EBE3', text: '#0F5E4A' }, // Mint
    { bg: '#DDE9F8', text: '#1E40AF' }, // Soft Blue
    { bg: '#EADDF8', text: '#5B21B6' }, // Soft Lavender
    { bg: '#F8DDE5', text: '#9D174D' }, // Soft Pink
  ],

  // -------------------------------------------------------------
  // Backward-compatibility Aliases (preserves safety across Phase A)
  // -------------------------------------------------------------
  primaryDark: '#0B4738',
  primaryLight: '#D9EBE3',
  primaryMuted: '#167A62',
  background: '#F5F2EC',
  card: '#FFFFFF',
  cardSecondary: '#ECE8DF',
  divider: '#D6D1C4',
  borderLight: '#D6D1C4',
  textMain: '#1C1C1C',
  textMuted: '#6B6B6B',
  textWhite: '#FFFFFF',

  // Semantic Status Aliases
  success: '#0F5E4A',
  danger: '#B5471B',
  tagBg: '#ECE8DF',

  statusPaid: '#0F5E4A',
  statusPaidBg: '#D9EBE3',
  statusDue: '#B5471B',
  statusDueBg: '#FBE6DA',
  statusHighRisk: '#792E07',
  statusHighRiskBg: '#FBE6DA',
  statusPartial: '#B5471B',
  statusPartialBg: '#FBE6DA',
  statusInactive: '#6B6B6B',
  statusInactiveBg: '#ECE8DF',
  statusUpcoming: '#6B6B6B',
  statusUpcomingBg: '#FFFFFF',

  // Charts Aliases
  chartSiteA: '#0F5E4A',
  chartShop: '#167A62',
  chartPoultry: '#2D9A7E',
  chartSiteB: '#62BEA7',
  chartIdle: '#D6D1C4',

  shadowColor: '#000000',
};
