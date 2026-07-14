## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.
## 2024-06-25 - [Redis User Presence Check]
**Learning:** Checking user presence using `redisService.getRoomUsers(roomId).includes(userId)` loads all users from Redis and does an O(N) check. In high-frequency socket events, this creates significant memory overhead and GC pressure.
**Action:** Use the O(1) `redisService.getUserSocketId(roomId, userId)` method instead of loading the entire room's user list when verifying user presence in a room.
