## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2023-10-25 - [Redis O(1) Presence Check Optimization]
**Learning:** Using `getRoomUsers` (which calls `HKEYS` under the hood) in high-throughput socket handlers to check if a single user is in a room creates an O(N) operation and causes unnecessary memory overhead/garbage collection.
**Action:** Always prefer the O(1) `getUserSocketId` (which calls `HGET`) when checking for a specific user's presence in a room instead of fetching all users and using `.includes()`.
