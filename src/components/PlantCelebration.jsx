// src/components/PlantCelebration.jsx
// Full-screen celebration shown when a focus session plants a new tree.

import { Link } from 'react-router-dom';
import Tree from './Tree';
import { SPECIES } from '../features/forest/species';

// Fixed leaf burst directions: [dx, dy, rotation] — fixed so renders stay pure
const LEAVES = [
  [-120, -90, -200], [110, -110, 220], [-150, 10, -120], [150, 0, 140],
  [-70, -150, -260], [80, -160, 300], [-110, 90, -90], [120, 80, 100],
  [0, -170, 180], [-30, 120, -60], [40, 130, 60], [-170, -50, -150],
];

export default function PlantCelebration({ tree, totalTrees, onClose, onStartBreak }) {
  const { species, minutes, label } = tree;
  const [, mid, light] = SPECIES[species].leaves;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plant-title"
    >
      <div
        className="anim-fade-up relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tree with a burst of leaves behind it */}
        <div className="relative h-44 flex items-end justify-center">
          {LEAVES.map(([dx, dy, rot], i) => (
            <span
              key={i}
              className="anim-leaf absolute left-1/2 bottom-16 w-3 h-2 rounded-full"
              style={{
                backgroundColor: i % 2 ? mid : light,
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
                '--rot': `${rot}deg`,
                animationDelay: '0.25s',
              }}
            />
          ))}
          <Tree species={species} size={130} className="anim-pop relative" />
        </div>

        <h2 id="plant-title" className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          {/^[aeiou]/i.test(SPECIES[species].name) ? 'An' : 'A'} {SPECIES[species].name} was planted! 🌱
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          +{minutes} min of focus · {totalTrees} {totalTrees === 1 ? 'tree' : 'trees'} in your forest
        </p>
        {label && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">📖 {label}</p>}

        <div className="mt-6 flex gap-3">
          <Link
            to="/forest"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            🌳 View forest
          </Link>
          <button
            onClick={onStartBreak}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
          >
            ☕ Start break
          </button>
        </div>
      </div>
    </div>
  );
}
