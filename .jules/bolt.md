## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [O(1) Redis Lookup for Socket Events]
**Learning:** Frequent socket events (like chat messages or sync events) were performing O(N) operations by fetching all room users (`hKeys`) into memory and using `.includes()` to check presence. This creates high memory overhead and garbage collection pressure in Node.js when scaling.
**Action:** Replace `redisService.getRoomUsers(roomId).includes(userId)` with the O(1) `redisService.getUserSocketId(roomId, userId)` method to check user presence directly from Redis using `hGet`, especially in high-frequency socket handlers.
