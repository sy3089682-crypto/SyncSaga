## 2024-06-26 - [Memoized Timeline Reactions grouped calculation]
**Learning:** `TimelineReactions.tsx` had a `.reduce` operation that calculated grouped reactions for `ReactionBar` every time the parent component `TimelineReactions` re-rendered. As `currentTime` state is changing frequently during video playback, this `O(N)` calculation happened repeatedly causing performance bottlenecks in long watch parties.
**Action:** Always memoize derived data based on long lists inside performance-sensitive rendering loops (like video players).
