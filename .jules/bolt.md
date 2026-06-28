## 2023-10-27 - [Timeline Reactions Performance]
**Learning:** Found an unused O(N) recalculation of the `grouped` array on every render in `TimelineReactions`, alongside unmemoized reactions list causing unnecessary O(N) operations in `ReactionBar`.
**Action:** Always verify if complex `.reduce` calculations inside components are actually consumed in the render, and proactively wrap heavy calculations like array grouping with `useMemo` when rendering components like `ReactionBar` that take frequently updating props (e.g., `currentTime` causing parent re-renders).
