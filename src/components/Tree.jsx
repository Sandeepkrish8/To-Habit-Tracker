// src/components/Tree.jsx
// Hand-drawn SVG tree. `growth` (0 → 1) grows it from a sprout to a full tree,
// so the Pomodoro timer can show the tree growing while you focus.

import { SPECIES } from '../features/forest/species';

const GROUND_Y = 112;
// Rotate/scale around the base of the trunk (SVG viewBox coordinates)
const BASE_ORIGIN = `50px ${GROUND_Y}px`;

function Sprout() {
  return (
    <g>
      <ellipse cx="50" cy={GROUND_Y} rx="10" ry="3" fill="#a16207" />
      <path d={`M50 ${GROUND_Y} Q49 102 50 96`} stroke="#15803d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="44" cy="96" rx="6" ry="3" fill="#22c55e" transform="rotate(-25 44 96)" />
      <ellipse cx="56" cy="94" rx="6" ry="3" fill="#4ade80" transform="rotate(25 56 94)" />
    </g>
  );
}

function Canopy({ species }) {
  const [dark, mid, light] = SPECIES[species]?.leaves ?? SPECIES.oak.leaves;

  if (species === 'pine') {
    return (
      <g>
        <polygon points="50,48 20,92 80,92" fill={dark} />
        <polygon points="50,30 24,74 76,74" fill={mid} />
        <polygon points="50,12 30,56 70,56" fill={light} />
      </g>
    );
  }

  return (
    <g>
      <circle cx="34" cy="64" r="20" fill={dark} />
      <circle cx="66" cy="64" r="20" fill={dark} />
      <circle cx="50" cy="46" r="26" fill={mid} />
      <circle cx="42" cy="38" r="10" fill={light} opacity="0.85" />

      {species === 'cherry' &&
        [[30, 58], [62, 40], [70, 66], [44, 66], [54, 28]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#fff" opacity="0.9" />
        ))}

      {species === 'golden' &&
        [[26, 40, 0], [76, 46, 0.6], [56, 20, 1.2]].map(([x, y, delay]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2} Z`}
            fill="#fef9c3"
            className="anim-twinkle"
            style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
          />
        ))}
    </g>
  );
}

function WitheredTree() {
  return (
    <g stroke="#78716c" strokeLinecap="round" fill="none">
      <path d={`M50 ${GROUND_Y} L50 48`} strokeWidth="6" />
      <path d="M50 78 L34 60 M50 66 L66 50 M50 56 L42 44 M66 50 L72 42" strokeWidth="3" />
      <ellipse cx="34" cy={GROUND_Y - 1} rx="4" ry="1.6" fill="#a8a29e" stroke="none" />
      <ellipse cx="64" cy={GROUND_Y} rx="3.5" ry="1.4" fill="#a8a29e" stroke="none" />
    </g>
  );
}

/**
 * @param {string}  species  — key of SPECIES
 * @param {number}  growth   — 0..1, how grown the tree is
 * @param {boolean} withered — draw a dead tree (abandoned session)
 * @param {number}  size     — rendered width in px (height is 1.2×)
 * @param {boolean} sway     — gentle wind animation
 */
export default function Tree({ species = 'oak', growth = 1, withered = false, size = 64, sway = true, className = '', style }) {
  const label = withered ? 'Withered tree' : `${SPECIES[species]?.name ?? 'Tree'}`;
  const isSprout = !withered && growth < 0.15;
  // Never scale to 0 so the tree is always visible once it starts growing
  const scale = withered ? 1 : 0.35 + 0.65 * Math.min(Math.max(growth, 0), 1);

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label={label}
      className={className}
      style={style}
    >
      <ellipse cx="50" cy={GROUND_Y + 1} rx="24" ry="4" fill="rgba(0,0,0,0.12)" />

      {withered ? (
        <WitheredTree />
      ) : isSprout ? (
        <Sprout />
      ) : (
        <g style={{ transform: `scale(${scale})`, transformOrigin: BASE_ORIGIN, transition: 'transform 0.6s ease-out' }}>
          <g className={sway ? 'anim-sway' : ''} style={{ transformOrigin: BASE_ORIGIN }}>
            <path d={`M45 ${GROUND_Y} L47 66 L53 66 L55 ${GROUND_Y} Z`} fill="#92400e" />
            <Canopy species={species} />
          </g>
        </g>
      )}
    </svg>
  );
}
