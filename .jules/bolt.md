## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.
## 2025-07-02 - [Redis Presence Check Optimization]
**Learning:** Frequent socket events (like chat or sync heartbeats) should not use O(N) Redis lookups followed by Array.includes() when a simple O(1) hash lookup is available. Using `redisService.getRoomUsers(roomId).includes(userId)` loads all users in a room into memory and adds GC pressure, while `redisService.getUserSocketId(roomId, userId)` just checks the user.
**Action:** Replace `getRoomUsers().includes()` with `getUserSocketId()` in high-frequency event handlers.
