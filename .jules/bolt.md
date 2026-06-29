2024-06-29 - ⚡ Bolt: [performance improvement] fix N+1 query in FeaturesService
Learning: MGET offers a substantial improvement in Redis query performance compared to sequential GETs for fetching feature toggles. Furthermore, MGET with fixed keys is significantly faster and more predictable than using KEYS followed by MGET.
Action: Prefer MGET with known keys over KEYS. When iterating collections of flags or known keys, map them to an array and use a single MGET call to reduce network roundtrips and avoid N+1 queries.
