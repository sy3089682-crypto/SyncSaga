## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2026-07-09 - [O(1) Redis Presence Checks]
**Learning:** Found an anti-pattern where room presence checks were performed by fetching all users in a room from Redis via `getRoomUsers` (O(N) operation) and calling `.includes(userId)`. For highly frequent events like chat messages and sync ticks, this caused unnecessary memory allocations and garbage collection pressure, particularly in large rooms.
**Action:** Replace O(N) list-fetching with direct, targeted O(1) checks using `getUserSocketId(roomId, userId)` whenever checking the presence of a single specific user in a room is required.
