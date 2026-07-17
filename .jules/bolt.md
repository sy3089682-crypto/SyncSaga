## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [O(1) Redis Lookups Optimization]
**Learning:** Checking if a user is in a room using `redisService.getRoomUsers(roomId).includes(userId)` performs an O(N) array lookup (`hKeys`) and then array scanning, creating high memory overhead and garbage collection pressure when called frequently (e.g. on every sync event).
**Action:** Use the O(1) `redisService.getUserSocketId(roomId, userId)` for user presence checks in room handlers to avoid fetching all room users.
