## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [Redis User Presence Check Optimization]
**Learning:** Frequent socket events (e.g. `chat:message` and `sync:state`) were validating user presence by fetching an entire array of room users from Redis (`HKEYS`) and then searching it (`Array.includes`), which has O(N) complexity. With many active users emitting events constantly, this creates high memory overhead, garbage collection pressure, and scaling bottlenecks.
**Action:** Always prefer O(1) direct Redis hash lookups (like `HGET` -> `getUserSocketId`) rather than fetching entire collections for simple membership checks, especially within high-frequency socket handlers.
