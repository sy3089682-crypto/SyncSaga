## 2026-06-22 - [O(N) recalculations on media ticks]
**Learning:** In media components that receive a frequently updating prop like `currentTime`, derived state (like grouped reactions from `.reduce()`) can cause severe O(N) recalculations on every tick if left unmemoized.
**Action:** Always wrap derived array calculations in `useMemo` in components that are subject to frequent re-renders.
