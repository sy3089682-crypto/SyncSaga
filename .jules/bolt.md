## 2024-05-24 - [Redis Presence Check Performance Anti-pattern]
**Learning:** Checking a specific user's presence in a room using `redisService.getRoomUsers(roomId).includes(userId)` performs an O(N) lookup that returns an array of all users, allocating unnecessary memory, increasing payload size over network, and contributing to GC pressure when run per-message in high-frequency socket events.
**Action:** Always prefer the O(1) point lookup `redisService.getUserSocketId(roomId, userId)` to verify presence unless the whole list of users is actually needed for iteration.
