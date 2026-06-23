import { useEffect, useState } from 'react';
import { fetchLeagues, getCurrentLeague } from '../services/leagues';
import type { League } from '../types';

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selected, setSelected] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeagues().then((ls) => {
      setLeagues(ls);
      setSelected(getCurrentLeague(ls));
      setLoading(false);
    });
  }, []);

  return { leagues, selected, setSelected, loading };
}
