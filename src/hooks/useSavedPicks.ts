import { useEffect, useState } from 'react';

import { getSavedPicks, subscribeSavedPicks, type SavedPick } from '@/services/pickStorage';

export function useSavedPicks(): SavedPick[] {
  const [picks, setPicks] = useState<SavedPick[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      getSavedPicks()
        .then((next) => {
          if (!cancelled) {
            setPicks(next);
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[pickStorage] Lecture impossible : ${message}`);
        });
    };

    load();
    const unsubscribe = subscribeSavedPicks(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return picks;
}
