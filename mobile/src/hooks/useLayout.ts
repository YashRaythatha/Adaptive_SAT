import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Breakpoints (width) for responsive behavior. */
const WIDTH = {
  small: 380,
  medium: 480,
  large: 600,
} as const;

/**
 * Provides dimensions, safe area insets, and responsive padding so content
 * adjusts to screen size (small phones, large phones, tablets) and safe areas.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallScreen = width < WIDTH.small;
  const isMediumScreen = width >= WIDTH.small && width < WIDTH.medium;
  const isLargeScreen = width >= WIDTH.medium;
  const isTablet = width >= WIDTH.large;

  // Horizontal padding: slightly larger on big screens, not too small on narrow
  const pagePaddingHorizontal = Math.max(16, Math.min(24, width * 0.05));
  const pagePaddingVertical = Math.max(20, Math.min(32, height * 0.025));

  // Optional: cap content width on tablets so text doesn't stretch too wide
  const maxContentWidth = isTablet ? 560 : undefined;

  return {
    width,
    height,
    insets,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isTablet,
    /** Use for page/screen horizontal padding. */
    pagePaddingHorizontal,
    /** Use for page top/bottom padding (in addition to safe area). */
    pagePaddingVertical,
    /** Max width for main content on tablets; undefined on phones. */
    maxContentWidth,
    /** Bottom inset for ScrollView content (tab bar + safe area). */
    scrollContentBottomPadding: Math.max(24, insets.bottom) + 56,
  };
}
