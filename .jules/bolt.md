## 2026-06-25 - [Timeline Re-render Overhead Avoided]
**Learning:** Timeline component re-rendered continuously on video playback time updates, executing O(N) operations and object creations on every render frame for an unused variable.
**Action:** Always verify if expensive reduce or array operations are actually utilized in frequently updating components (like those tracking currentTime), and memoize them or remove them entirely to reduce GC pressure and CPU load.
