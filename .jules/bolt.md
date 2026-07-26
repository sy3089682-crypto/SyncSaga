## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [Redis Presence Check Optimization]
**Learning:** Checking if a user is in a room using `getRoomUsers(roomId).includes(userId)` performs an O(N) operation since it retrieves the entire list of users and searches through it. In high-frequency socket events (like chat messages or sync events), this causes unnecessary garbage collection pressure and high memory overhead.
**Action:** Use the O(1) `getUserSocketId(roomId, userId)` method to check user presence in a room instead of fetching the entire list of users when only presence verification is needed.
