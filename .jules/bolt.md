## 2026-06-11 - Unnecessary O(N) Array Reduction on Every Render
**Learning:** Found an unused variable `grouped` that was performing an O(N) array reduction on every render in a component that receives a potentially large array of `reactions`. Also found another `grouped` variable doing the same thing that was being used, but it wasn't wrapped in `useMemo`, causing it to recalculate on every render.
**Action:** Remove unused variables doing expensive operations and use `useMemo` to cache expensive operations that depend on props so they aren't recalculated on every render.
