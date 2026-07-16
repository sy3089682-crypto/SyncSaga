## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [Redis O(1) Presence Check Optimization]
**Learning:** During high-frequency WebSocket events (e.g., `chat:message` and `sync:event`), verifying user presence in a room using `getRoomUsers(roomId).includes(userId)` causes unnecessary O(N) array memory allocation and iteration on every event. Given the large volume of events, this leads to high garbage collection pressure.
**Action:** Always prefer using the O(1) `getUserSocketId(roomId, userId)` method to check existence when possible, instead of fetching the entire array of users just to see if one user exists in the room.
