/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Waze-like bright blue primary
const tintColorLight = '#2DD0F6';
const tintColorDark = '#2DD0F6';

export const Colors = {
  light: {
    text: '#11181C',
  background: '#F7F9FC',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  // Extended palette (optional consumers)
  primary: tintColorLight,
  primaryDark: '#1B9CDA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  success: '#00C853',
  warning: '#FFC107',
  danger: '#FF5252',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  // Extended palette (optional consumers)
  primary: tintColorDark,
  primaryDark: '#1B9CDA',
  surface: '#1E1F22',
  border: '#2A2D31',
  success: '#00E676',
  warning: '#FFC107',
  danger: '#FF5252',
  },
};
