import React from 'react';
import { Handshake, Lightbulb, Heart, Star, Award } from 'lucide-react';

export function getBadgeIcon(badge: string) {
  switch (badge) {
    case 'TEAM_PLAYER':
      return <Handshake className="h-3.5 w-3.5" />;
    case 'INNOVATOR':
      return <Lightbulb className="h-3.5 w-3.5" />;
    case 'CUSTOMER_CHAMPION':
      return <Heart className="h-3.5 w-3.5" />;
    case 'ROCKSTAR':
      return <Star className="h-3.5 w-3.5" />;
    default:
      return <Award className="h-3.5 w-3.5" />;
  }
}

export function getBadgeColors(badge: string) {
  switch (badge) {
    case 'TEAM_PLAYER':
      return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 border-sky-200 dark:border-sky-900/30';
    case 'INNOVATOR':
      return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200 dark:border-amber-900/30';
    case 'CUSTOMER_CHAMPION':
      return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-200 dark:border-rose-900/30';
    case 'ROCKSTAR':
      return 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-purple-200 dark:border-purple-900/30';
    default:
      return 'bg-primary/5 text-primary border-primary/10';
  }
}
