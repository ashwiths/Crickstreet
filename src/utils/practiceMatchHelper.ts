/**
 * Helpers to automate players and bowlers selection for practice matches
 */

export function isPracticeMatch(oppTeamName?: string, matchType?: string): boolean {
  return (
    matchType?.toLowerCase() === 'practice' ||
    oppTeamName?.toLowerCase() === 'practice opponent'
  );
}

export function getNextOpponentBatterName(dismissedCount: number): string {
  // Since Opp 1 and Opp 2 start, the next batsman is Opp 3, Opp 4, etc.
  return `Opp ${dismissedCount + 2}`;
}

export function getNextOpponentBowlerName(currentBowler: string): string {
  // Alternates between Opp bowl 1 and Opp bowl 2
  if (currentBowler === 'Opp bowl 1') {
    return 'Opp bowl 2';
  }
  return 'Opp bowl 1';
}
