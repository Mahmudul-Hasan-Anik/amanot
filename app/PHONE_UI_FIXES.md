# Phone UI corrections

- Migrated legacy React Native SafeAreaView imports to the already-installed
  react-native-safe-area-context implementation across account screens and Page.
  Android headers now respect status bars and camera cutouts.
- Tab screens reserve top/side insets; the navigator handles the bottom inset.
  Tab bar height and bottom padding now accommodate gesture/three-button navigation.
- Replaced the default tab button ripple with a plain Pressable, retaining
  navigation, long press, accessibility labels and selected state. The selected
  icon's green pill remains the intentional current-tab indicator.
- Added a regression scenario for two societies both named N11: their IDs,
  profiles and visible settings remain isolated. Names are display metadata,
  not tenant identifiers. Existing global phone uniqueness remains in place.

Validation: TypeScript and 36 accounting checks passed. Physical Android layout
and tap effects still require verification in an updated APK. These UI changes
are local source changes; the installed 1.0.3 APK has not been rebuilt here.
