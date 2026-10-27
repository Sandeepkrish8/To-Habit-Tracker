// src/components/ForestScene.jsx
// The living forest on the home screen.
//   • Sky follows your real clock: dawn, day, sunset, night (with stars)
//   • Weather follows your consistency: ☀️ on track · ⛅ 1–2 missed days · 🌧️ 3+
//   • Finishing a habit sends a 💧 water drop flying into a tree
//   • Tap a tree to see the focus session that planted it

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Tree from './Tree';
import useNow from '../hooks/useNow';
import { selectConsistency, selectTotalHabits } from '../features/habits/habitsSlice';
import { weatherOf } from '../features/habits/weather';
import { phaseOf, SKIES, RAIN_SKIES } from '../features/habits/sky';
import { selectTrees } from '../features/forest/forestSlice';
import { SPECIES } from '../features/forest/species';
import { parseDateStr } from '../utils/date';

const MAX_TREES = 8;

const HILLS = { dawn: '#86efac', day: '#86efac', sunset: '#65a30d', night: '#14532d' };

// Fixed star positions [left%, top%, delay s]
const STARS = [[8, 12, 0], [22, 30, 0.8], [35, 8, 1.6], [48, 22, 0.4], [62, 10, 1.2], [74, 28, 2], [86, 14, 0.6], [92, 34, 1.4], [15, 44, 1], [55, 38, 1.8]];

/** One flying water drop, animated with the Web Animations API */
function WaterDrop({ drop, onDone }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const { x0, y0, x1, y1 } = drop;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone(drop);
      return;
    }
    const peak = Math.min(y0, y1) - 80; // arc up and over
    const anim = el.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(0.4)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0 - 30}px) scale(1)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${(x0 + x1) / 2}px, ${peak}px) scale(1.1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.6)`, opacity: 0.9 },
    ], { duration: 950, easing: 'ease-in-out' });
    anim.onfinish = () => onDone(drop);
    return () => anim.cancel();
  }, [drop, onDone]);

  return (
    <span ref={ref} className="fixed left-0 top-0 z-[65] pointer-events-none text-2xl -ml-3 -mt-4" aria-hidden="true">
      💧
    </span>
  );
}

export default function ForestScene() {
  const consistency = useSelector(selectConsistency);
  const habitCount = useSelector(selectTotalHabits);
  const allTrees = useSelector(selectTrees);
  const now = useNow(true, 60_000);

  const [selected, setSelected] = useState(null);   // tree id showing its tooltip
  const [drops, setDrops] = useState([]);
  const [drinking, setDrinking] = useState(null);    // { index, key } of the tree being watered
  const treeRefs = useRef([]);

  const phase = phaseOf(new Date(now).getHours());
  const weather = weatherOf(consistency, habitCount > 0);
  const trees = allTrees.filter((t) => !t.withered).slice(-MAX_TREES);
  const slots = trees.length > 0 ? trees : [null, null, null]; // sprouts until the first tree

  // Catch water drops sent by habit cards and aim each at a random tree
  useEffect(() => {
    const onWater = (e) => {
      const targets = treeRefs.current.filter(Boolean);
      if (targets.length === 0) return;
      const index = Math.floor(Math.random() * targets.length);
      const r = targets[index].getBoundingClientRect();
      // Build the drop outside the updater so the updater stays pure
      const drop = {
        id: `${Date.now()}-${Math.random()}`,
        x0: e.detail.x, y0: e.detail.y,
        x1: r.left + r.width / 2, y1: r.top + r.height * 0.3,
        index,
      };
      setDrops((list) => [...list, drop]);
    };
    window.addEventListener('habitflow:water', onWater);
    return () => window.removeEventListener('habitflow:water', onWater);
  }, []);

  // The drop landed: remove it and make its tree "drink"
  const finishDrop = useCallback((drop) => {
    setDrops((list) => list.filter((d) => d.id !== drop.id));
    setDrinking({ index: drop.index, key: drop.id });
  }, []);

  const sky = weather === 'rainy' ? RAIN_SKIES[phase] : SKIES[phase];
  const night = phase === 'night';
  const { dayStreak, missedDays } = consistency;

  const badge = {
    sunny:  `${night ? '🌙 Clear night' : '☀️ Sunny'}${dayStreak > 0 ? ` · ${dayStreak}-day streak` : ''}`,
    cloudy: `⛅ Cloudy · missed ${missedDays} day${missedDays === 1 ? '' : 's'}`,
    rainy:  `🌧️ Rainy · missed ${missedDays} days`,
  }[weather];

  return (
    <div
      className={`relative h-56 sm:h-64 rounded-3xl overflow-hidden bg-gradient-to-b ${sky} shadow-sm transition-colors duration-1000`}
      onClick={() => setSelected(null)}
    >
      {/* Stars + moon at night */}
      {night && STARS.map(([l, t, d]) => (
        <span
          key={`${l}-${t}`}
          className="anim-star absolute w-1 h-1 rounded-full bg-white"
          style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s` }}
          aria-hidden="true"
        />
      ))}

      {/* Sun or moon */}
      {weather !== 'rainy' && (
        night ? (
          <div className="absolute right-8 top-6 w-11 h-11 rounded-full bg-slate-100 shadow-[0_0_30px_8px_rgba(226,232,240,0.35)]" aria-hidden="true">
            <span className="absolute right-2 top-2 w-3 h-3 rounded-full bg-slate-300/70" />
          </div>
        ) : (
          <div
            className={`absolute w-12 h-12 rounded-full bg-yellow-300 shadow-[0_0_0_10px_rgba(253,224,71,0.3),0_0_50px_18px_rgba(253,224,71,0.5)] transition-all duration-1000
              ${phase === 'dawn' ? 'left-10 top-24' : phase === 'sunset' ? 'right-10 top-24 bg-orange-300' : 'right-10 top-6'}
              ${weather === 'cloudy' ? 'opacity-60' : ''}`}
            aria-hidden="true"
          />
        )
      )}

      {/* Clouds */}
      <div className="anim-drift absolute left-12 top-12" aria-hidden="true">
        <div className={`w-20 h-6 rounded-full ${weather === 'sunny' ? 'bg-white/80' : 'bg-slate-300'} shadow-[22px_-8px_0_2px_currentColor] ${weather === 'sunny' ? 'text-white/80' : 'text-slate-300'}`} />
      </div>
      {weather !== 'sunny' && (
        <>
          <div className="anim-drift absolute left-1/2 top-8" style={{ animationDelay: '-4s' }} aria-hidden="true">
            <div className="w-28 h-8 rounded-full bg-slate-400 shadow-[30px_-10px_0_4px_currentColor] text-slate-400" />
          </div>
          <div className="absolute inset-0 bg-slate-500/20" aria-hidden="true" />
        </>
      )}
      {weather === 'rainy' && <div className="anim-rain absolute inset-0 opacity-70" aria-hidden="true" />}

      {/* Weather badge */}
      <span className={`absolute left-4 top-4 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm
        ${night || weather === 'rainy' ? 'bg-slate-900/50 text-slate-100' : 'bg-white/80 text-sky-800'}`}>
        {badge}
      </span>

      {/* Hill */}
      <div
        className="absolute -bottom-16 -left-8 -right-8 h-32 rounded-[50%] transition-colors duration-1000"
        style={{ backgroundColor: weather === 'rainy' ? '#4d7c62' : HILLS[phase] }}
        aria-hidden="true"
      />

      {/* Trees */}
      <div
        className={`absolute bottom-3 inset-x-0 flex justify-center items-end gap-0.5 sm:gap-1 px-4 transition-[filter] duration-1000
          ${weather === 'rainy' ? 'saturate-50 brightness-90' : night ? 'brightness-75' : ''}`}
      >
        {slots.map((t, i) => (
          <button
            key={t?.id ?? `sprout-${i}`}
            ref={(el) => { treeRefs.current[i] = el; }}
            onClick={(e) => { e.stopPropagation(); if (t) setSelected(selected === t.id ? null : t.id); }}
            // Phones show 6 trees, wider screens all 8
            className={`relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg ${i >= 6 ? 'hidden sm:block' : ''}`}
            aria-label={t ? `${SPECIES[t.species].name}, ${t.minutes} minutes` : 'Sprout — finish a focus session to grow a tree'}
          >
            <Tree
              key={drinking?.index === i ? drinking.key : 'still'}
              species={t?.species ?? 'oak'}
              growth={t ? 1 : 0}
              size={t ? 36 + Math.min(t.minutes, 60) * 0.35 : 40}
              className={drinking?.index === i ? 'anim-drink' : ''}
            />
            {t && selected === t.id && (
              <span className="anim-fade-up absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] leading-tight shadow-lg">
                <b>{SPECIES[t.species].name}</b> · {t.minutes} min
                <br />
                {parseDateStr(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {t.label && <> · 📖 {t.label}</>}
              </span>
            )}
          </button>
        ))}
      </div>

      {drops.map((d) => <WaterDrop key={d.id} drop={d} onDone={finishDrop} />)}
    </div>
  );
}
