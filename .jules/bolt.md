## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [Redis O(1) Presence Checks]
**Learning:** The previous implementation relied on fetching all room users (O(N) operation) and searching the array to verify if a single user was present during frequent socket events (chat, sync). This causes significant garbage collection overhead and network payload bloat for large rooms.
**Action:** Use O(1) Redis operations like `getUserSocketId(roomId, userId)` or `SISMEMBER` instead of fetching entire arrays like `getRoomUsers` when only verifying a single user's presence. Always favor direct dictionary/hash lookups in high-throughput socket handlers.
