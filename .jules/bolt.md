## 2025-02-23 - [TimelineReactions Optimization]
**Learning:** React components containing list iterations often have duplicate or unused `reduce` iterations that cause unnecessary re-renders. We identified one such case in `TimelineReactions.tsx` where an entire list was mapped into a dictionary structure (`grouped`) in `TimelineReactions` itself but only used further down in a separate component (`ReactionBar`).
**Action:** Always scan for unneeded O(N) operations in components that receive lists or arrays of data. Dead code removal should accompany memoization wherever applicable, and any remaining expensive computations should be enclosed in `useMemo`.

## 2025-02-23 - [O(1) Socket Room Presence Checks]
**Learning:** Checking if a user is in a room using `getRoomUsers(roomId).includes(userId)` performs an O(N) lookup that returns a potentially large array of all users in the room. In high-frequency socket events (like `sync:event`, `chat:message`, or `sync:takeover`), returning large arrays continuously causes significant garbage collection pressure and CPU overhead.
**Action:** Replace `getRoomUsers(roomId).includes(userId)` with the O(1) Redis hash lookup `getUserSocketId(roomId, userId)` which directly queries the specific user's presence without fetching the entire room list.
