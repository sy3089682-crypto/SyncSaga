## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-05-18 - [Optimize Room User Presence Checks]
**Learning:** Checking if a user is in a room using `redisService.getRoomUsers(roomId).includes(userId)` causes high memory overhead and garbage collection pressure because it retrieves all users via `HKEYS` and iterates over them (O(N) operation).
**Action:** Always prefer using `!!(await redisService.getUserSocketId(roomId, userId))` which executes an O(1) `HGET` operation directly on the Redis hash map to determine user presence, especially in high-frequency socket events.

## 2025-05-18 - [Optimize Room User Presence Checks]
**Learning:** Checking if a user is in a room using `redisService.getRoomUsers(roomId).includes(userId)` causes high memory overhead and garbage collection pressure because it retrieves all users via `HKEYS` and iterates over them (O(N) operation).
**Action:** Always prefer using `!!(await redisService.getUserSocketId(roomId, userId))` which executes an O(1) `HGET` operation directly on the Redis hash map to determine user presence, especially in high-frequency socket events.
