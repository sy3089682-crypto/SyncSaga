## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [O(1) Redis User Presence Checks]
**Learning:** Checking if a user is in a room during high-frequency socket events (like chat or sync) using `getRoomUsers(roomId).includes(userId)` forces an O(N) operation and deserializes the entire list of users, causing unnecessary memory allocation and garbage collection pressure.
**Action:** Always prefer the O(1) `redisService.getUserSocketId(roomId, userId)` method to check presence for specific users instead of fetching the entire room list, especially in hot paths like socket event handlers.
