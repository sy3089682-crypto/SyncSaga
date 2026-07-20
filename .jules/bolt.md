## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [O(1) Redis User Presence Check]
**Learning:** Using `getRoomUsers(roomId).includes(userId)` requires fetching all user IDs in a room (O(N) operation) which creates memory overhead and garbage collection pressure in high-frequency socket events (like chat or sync).
**Action:** Replace `getRoomUsers` with the O(1) `getUserSocketId(roomId, userId)` method to check if a specific user is in a room. This significantly reduces memory allocations and improves handler performance.
