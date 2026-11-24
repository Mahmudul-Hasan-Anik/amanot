# Amanot (আমানত)

A modern, transparent, and mobile-friendly society management and digital khata system designed for cooperative societies and somitis in Bangladesh.

## Features

- **Member Management**: Transparent records with unique member IDs, WhatsApp contacts, and role permissions (Director, Member, Admin).
- **Passbook & WhatsApp Statements**: Instant one-click passbook and transaction statements sent directly via WhatsApp.
- **Digital Khata & Double-Entry Accounting**: Real-time asset tracking across cash-in-hand, cashier, bank accounts, and mobile wallets (bKash/Nagad).
- **Deposits & Investments**: Flexible monthly savings collection, voluntary deposits, investment contracts with tenure/profit distribution, and installment tracking.
- **Society Backup & Export**: Automated JSON and CSV exports of the entire society state with full SomitiPro import compatibility.

## Tech Stack

- **Frontend / Mobile**: [Expo](https://expo.dev/) (React Native), TypeScript, Expo Router.
- **State Management**: Zustand with persistent storage.
- **Backend / Database**: Supabase (PostgreSQL with RLS policies and transactional RPCs).
- **Localization**: Full bilingual support (Bengali & English) with localized digits and currency formatting (৳).

## Getting Started

For local development setup, environment variables, Supabase migrations, and test commands, please refer to:

👉 **[Developer Setup & Deployment Guide](app/SETUP.md)**

## Project Structure

```text
├── app/                  # Main Expo / React Native application
│   ├── app/              # Expo Router screens (admin, member, public)
│   ├── src/              # Components, hooks, lib, store, theme, i18n
│   ├── scripts/          # Test scripts and utility tools
│   ├── supabase/         # Schema, migrations, and database policies
│   └── SETUP.md          # Setup and deployment instructions
├── docs/
│   └── archive/          # Historical sprint planning, migration, and audit notes
└── state/                # Migration and test fixtures
```

## Documentation

Historical sprint reports, architectural audits, and previous version release notes are archived under [`docs/archive/`](docs/archive/).
