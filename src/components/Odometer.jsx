// src/components/Odometer.jsx
// Numbers that roll like a car's odometer when they change (Framer Motion).
// Each digit is a column of 0–9; we slide the column so the right digit shows.

import { motion } from 'framer-motion';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digit({ value }) {
  return (
    <span className="relative inline-block overflow-hidden h-[1em] leading-none align-[-0.1em]" style={{ width: '1ch' }} aria-hidden="true">
      <motion.span
        className="absolute left-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-value}em` }}
        transition={{ type: 'spring', stiffness: 210, damping: 24 }}
      >
        {DIGITS.map((d) => <span key={d} className="h-[1em] leading-none">{d}</span>)}
      </motion.span>
    </span>
  );
}

export default function Odometer({ value, className = '' }) {
  const chars = String(value).split('');
  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      {/* Screen readers read this plain copy; the rolling columns are hidden from them */}
      <span className="sr-only">{value}</span>
      {chars.map((ch, i) =>
        /\d/.test(ch)
          // Key by position from the right, so the ones digit stays the ones digit as numbers grow
          ? <Digit key={`d${chars.length - i}`} value={Number(ch)} />
          : <span key={`c${i}`} aria-hidden="true">{ch}</span>
      )}
    </span>
  );
}
