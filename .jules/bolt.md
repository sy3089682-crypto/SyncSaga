## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.
## 2025-02-18 - [Optimize Redis Presence Checks]
**Learning:** Using `redisService.getRoomUsers(roomId).includes(userId)` performs an O(N) array allocation and search for every event, causing high memory overhead and garbage collection pressure, particularly noticeable on high-frequency socket events like `sync:event` and `chat:message`.
**Action:** Use the O(1) direct lookup `redisService.getUserSocketId(roomId, userId)` to verify presence or connection state to eliminate the bottleneck and maintain steady memory overhead.
