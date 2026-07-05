## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2026-07-05 - [O(1) Redis presence checks in Socket Handlers]
**Learning:** Found an architectural pattern using O(N) queries for presence checks: `redisService.getRoomUsers(roomId).includes(userId)`. This gets extremely hot in WebSockets during broadcast events (e.g., chat spam, sync events) creating excessive memory allocations and GC pressure because it fetches all users in a room just to verify one.
**Action:** Replace all `getRoomUsers().includes()` calls with the O(1) direct check `getUserSocketId(roomId, userId)`. Always use targeted O(1) key lookups for authorization and presence rather than retrieving entire sets when dealing with socket event handlers.
