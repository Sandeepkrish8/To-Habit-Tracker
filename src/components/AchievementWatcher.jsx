// src/components/AchievementWatcher.jsx
// Watches derived progress and announces anything new: unlocked badges, level-ups,
// and finished weekly challenges. Renders nothing itself.

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '../context/toast';
import { selectProgress, levelTitle, XP } from '../features/achievements/progress';
import {
  selectAchievementState, initAchievements, markBadgesSeen, markLevelSeen, claimChallenge,
} from '../features/achievements/achievementsSlice';

export default function AchievementWatcher() {
  const dispatch = useDispatch();
  const toast = useToast();
  const progress = useSelector(selectProgress);
  const seen = useSelector(selectAchievementState);

  useEffect(() => {
    const unlocked = progress.badges.filter((b) => b.unlocked);

    // First run ever: whatever you already earned is "seen" — no burst of old toasts
    if (!seen.initialized) {
      dispatch(initAchievements({ badges: unlocked.map((b) => b.id), level: progress.level }));
      return;
    }

    const fresh = unlocked.filter((b) => !seen.seenBadges.includes(b.id));
    if (fresh.length > 0) {
      fresh.forEach((b) => toast.show({ variant: 'badge', icon: b.icon, title: b.name, message: b.desc, duration: 6000 }));
      dispatch(markBadgesSeen(fresh.map((b) => b.id)));
    }

    if (progress.level > seen.seenLevel) {
      toast.show({
        variant: 'level',
        icon: '🎉',
        title: `Level ${progress.level} · ${levelTitle(progress.level)}`,
        message: `${progress.needed} XP to the next level`,
        duration: 7000,
      });
      dispatch(markLevelSeen(progress.level));
    }

    const c = progress.challenge;
    if (c && !c.claimed && c.done >= c.target) {
      toast.show({
        variant: 'badge',
        icon: '🎯',
        title: 'Weekly challenge complete!',
        message: `+${XP.challenge} XP for ${c.habit.name}`,
        duration: 6000,
      });
      dispatch(claimChallenge(c.week));
    }
  }, [progress, seen, dispatch, toast]);

  return null;
}
