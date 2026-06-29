2026-06-29 - [Optimize network I/O in socket presence handler]
Learning: Looping to emit individual Socket.IO events for a high-volume event like initial connection "online user sync" creates massive packet overhead and Event Loop blocking.
Action: Batch initial payloads into a unified array (`presence:sync`) and broadcast it as a single socket event to reduce latency and encoding overhead.
