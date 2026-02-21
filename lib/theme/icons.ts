import { palette } from './palette';

/**
 * Centralized Icon Names for Consistency
 * Usage: <Ionicons name={icons.video} size={24} color={colors.primary} />
 */
export const icons = {
  // Navigation
  back: 'arrow-back',
  forward: 'arrow-forward',
  close: 'close',
  chevronBack: 'chevron-back',
  chevronForward: 'chevron-forward',
  menu: 'menu',
  add: 'add',
  
  // Resource Types
  video: 'play-outline',
  article: 'reader-outline',
  web: 'globe-outline',
  link: 'link-outline',
  
  // Status & Feedback
  completed: 'checkmark-circle',
  skipped: 'play-forward',
  pending: 'ellipse-outline',
  locked: 'lock-closed',
  star: 'star',
  starHalf: 'star-half',
  starOutline: 'star-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  
  // Learning / Gamification
  trophy: 'trophy',
  milestone: 'flag-outline',
  time: 'time-outline',
  duration: 'timer-outline',
  book: 'book-outline',
  sparkles: 'sparkles-outline',
  flash: 'flash-outline',
  flame: 'flame-outline',
  rocket: 'rocket-outline',
  brain: 'brain-outline',

  // Skip Reasons
  skipAlreadyKnow: 'school-outline',
  skipTooHard: 'barbell-outline',
  skipTooEasy: 'walk-outline',
  skipNotRelevant: 'remove-circle-outline',
  skipBadResource: 'unlink-outline',
  skipNotTheTime: 'moon-outline',
  skipOther: 'chatbox-outline',
} as const;

export type IconName = keyof typeof icons;

/**
 * Component-specific styles that should be consistent across the app
 */
export const componentStyles = {
  // Navigation
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  
  // Badges
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  // Action Buttons
  mainActionBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Cards
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
} as const;
