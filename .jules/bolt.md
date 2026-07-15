## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2026-07-15 - [CommandPalette Re-render Optimization]
**Learning:** Command palettes or search components that filter lists of items based on a query often recalculate derived state (like deduplicating categories or filtering arrays) on every single render cycle. Without memoization, components doing `O(N)` list filtering and deduplication map arrays (`[...new Set(array.map(...))]`) repeatedly unnecessarily when irrelevant state triggers a re-render.
**Action:** Always wrap derived lists (like `filtered` results or `categories` deduced from those results) inside `useMemo` with minimal dependency arrays in frequently-rendered search components.
