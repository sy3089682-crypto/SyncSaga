## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2026-07-11 - [Redis O(1) Presence Checks]
**Learning:** Using `getRoomUsers().includes(userId)` creates O(N) memory/GC overhead during high-frequency socket events.
**Action:** Replace it with O(1) `getUserSocketId(roomId, userId)` to avoid loading full user lists unnecessarily.
