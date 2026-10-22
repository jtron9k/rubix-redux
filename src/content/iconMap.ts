import {
  Award,
  Baby,
  BadgeCheck,
  Calendar,
  CalendarClock,
  Clock,
  Heart,
  HeartHandshake,
  HelpCircle,
  Home,
  type LucideIcon,
  MapPin,
  Moon,
  PartyPopper,
  Phone,
  School,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  ThumbsUp,
  Timer,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

// Icon names usable in content. check-content fails on names missing here,
// because resolveIcon would otherwise fall back to HelpCircle without a warning.
export const iconMap: Record<string, LucideIcon> = {
  award: Award,
  baby: Baby,
  'badge-check': BadgeCheck,
  calendar: Calendar,
  'calendar-clock': CalendarClock,
  clock: Clock,
  heart: Heart,
  'heart-handshake': HeartHandshake,
  home: Home,
  'map-pin': MapPin,
  moon: Moon,
  'party-popper': PartyPopper,
  phone: Phone,
  school: School,
  'shield-check': ShieldCheck,
  smile: Smile,
  sparkles: Sparkles,
  star: Star,
  stethoscope: Stethoscope,
  'thumbs-up': ThumbsUp,
  timer: Timer,
  'user-check': UserCheck,
  users: Users,
  zap: Zap,
};

export const ICON_NAMES = Object.keys(iconMap);

export function resolveIcon(name: string | undefined): LucideIcon {
  return (name && iconMap[name]) || HelpCircle;
}
