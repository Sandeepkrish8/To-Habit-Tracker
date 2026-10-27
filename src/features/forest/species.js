// src/features/forest/species.js
// Tree species you can grow. New species unlock as your forest grows.

export const SPECIES = {
  oak: {
    name:    'Oak',
    unlockAt: 0,
    leaves:  ['#16a34a', '#22c55e', '#4ade80'],
  },
  pine: {
    name:    'Pine',
    unlockAt: 5,
    leaves:  ['#065f46', '#047857', '#059669'],
  },
  cherry: {
    name:    'Cherry Blossom',
    unlockAt: 15,
    leaves:  ['#ec4899', '#f472b6', '#fbcfe8'],
  },
  maple: {
    name:    'Maple',
    unlockAt: 30,
    leaves:  ['#c2410c', '#ea580c', '#fb923c'],
  },
  golden: {
    name:    'Golden Tree',
    unlockAt: 60,
    leaves:  ['#b45309', '#f59e0b', '#fde047'],
  },
};

export const SPECIES_IDS = Object.keys(SPECIES);

/** Is this species unlocked for a forest with `treeCount` healthy trees? */
export const isUnlocked = (speciesId, treeCount) =>
  treeCount >= (SPECIES[speciesId]?.unlockAt ?? Infinity);

/** The next species still locked, or null when everything is unlocked */
export const nextUnlock = (treeCount) =>
  SPECIES_IDS.map((id) => ({ id, ...SPECIES[id] })).find((s) => treeCount < s.unlockAt) ?? null;
