## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-03-01 - [O(1) vs O(N) Redis Lookups for Socket Events]
**Learning:** Checking a user's presence in a room via `redisService.getRoomUsers(roomId).includes(userId)` requires an O(N) `HKEYS` command in Redis and creates an array in Node.js on every event. For frequent socket emissions like `chat:message` and `sync:event`, this causes unnecessary Redis CPU overhead and Node garbage collection pressure.
**Action:** Replace `getRoomUsers(roomId).includes(userId)` with the existing `redisService.getUserSocketId(roomId, userId)` for O(1) `HGET` checking during frequent, per-message event validation.
