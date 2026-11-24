# Amanot UI component audit — 2026-10-09

## Findings

The app already has reusable UI components, but screens frequently implement similar controls directly. The New Project floating button rendered both an add icon and a literal `+` in its label. Its local styling was copied into four other screens.

Inventory after this change, reproduced with `node app/scripts/audit-ui.cjs`:

| Source category | Declarations |
| --- | ---: |
| Route files, including layouts | 36 |
| Shared component files | 22 |
| Direct TouchableOpacity / Pressable | 255 / 4 |
| Shared Button / FAB | 6 / 5 |
| Shared Card | 16 |
| Shared FilterChip / StatusChip | 5 / 1 |
| Shared SearchBar / Input | 1 / 0 |
| Direct TextInput | 56 |
| AppModal JSX usages | 14 |
| Direct containers whose style names contain Card | 86 |

These are static JSX declaration counts, not runtime element counts or verified duplicate counts. A mapped list declaration may create many cards. Direct touch controls include navigation, icon actions, selectable rows and keypad keys; they should not all become ordinary buttons.

## Implemented

- All five floating actions (home deposit, members, collection, projects, finance) now use FAB, which composes Button. Deleted each screen's duplicate FAB styles.
- Removed the literal `+` from New Project and Record Expense labels; the icon supplies it once.
- Centralized FAB padding, shadow, icon spacing, minimum height, bounded width and Bengali label line height. Text can shrink/wrap while the icon retains its width.
- Button exposes button role, readable label and disabled/busy accessibility state. Icon-only FAB does not render an empty label with spacing.
- Projects uses FilterChip for its four status filters and StatusChip for project badges. Filter row wraps on narrow screens; chip selection is accessible.
- Projects, collection and finance summaries reuse Card's surface variant. Screens keep only their specific spacing/layout overrides.
- Create Project uses Button. Existing project creation and accounting behavior is unchanged.
- StatusChip now uses the shared Bengali font and typography tokens.

## Remaining migration candidates

1. Audit direct form submit/cancel controls and migrate matching controls to Button; preserve icon actions, navigation and selectable rows.
2. Move repeated search fields and matching labeled form fields to SearchBar/Input; retain screen-specific keyboard, validation and focus behavior.
3. Group card containers by actual layout and interaction before migration. Static summaries can use Card; navigable member/project rows need a suitable interactive abstraction.
4. Consolidate screen-local modal implementations with AppModal only after comparing dismissal, keyboard and Android back behavior.
5. Check each migrated screen in Bengali and English with long labels, loading, empty and populated states.

This change removes the confirmed floating-button duplication and migrates matching project controls and summary cards. It does not claim every repeated UI implementation has been migrated.

## Verification

TypeScript and screen design-token checks passed. Live-mode local web export completed. The isolated demo was checked in a 360px-wide preview: populated list, empty completed filter, corrected floating label and opening the New Project form all worked. No project was submitted and no real account or financial data was changed. Native Android rendering remains a device check.

APK build/update remains on hold until the user explicitly requests it.
