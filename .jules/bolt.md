## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.
## 2025-02-23 - [Redis Presence Check Optimization]
**Learning:** Frequent socket events (like chat or sync) shouldn't use O(N) array scans () to check user presence in a room, especially when O(1) alternatives exist. This codebase provides  which directly queries the hash for presence, saving memory and processing time.
**Action:** Always prefer O(1) lookups over O(N) array retrievals for presence/authorization checks on high-frequency socket events.
## 2025-02-23 - [Redis Presence Check Optimization]
**Learning:** Frequent socket events (like chat or sync) shouldn't use O(N) array scans (`getRoomUsers(roomId).includes(userId)`) to check user presence in a room, especially when O(1) alternatives exist. This codebase provides `redisService.getUserSocketId(roomId, userId)` which directly queries the hash for presence, saving memory and processing time.
**Action:** Always prefer O(1) lookups over O(N) array retrievals for presence/authorization checks on high-frequency socket events.
