// src/hooks/useNow.js
// Returns the current timestamp, refreshed every `interval` ms while `active`.

import { useEffect, useState } from 'react';

export default function useNow(active = true, interval = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [active, interval]);

  return now;
}
