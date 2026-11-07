# Recurring System Design Trade-offs

One-liner justifications for the decisions that show up across almost every system
design interview, regardless of the specific system. Apply the relevant one inline
when the phase reaches that decision — don't just recite the whole list.

### SQL vs NoSQL
Pick SQL when: the data is genuinely relational (entities reference each other),
and you need ACID transactions for a multi-step state change (e.g. inventory hold
→ confirm). Pick NoSQL (Dynamo/Cassandra-style) when: you need very high write
throughput and can tolerate eventual consistency — e.g. activity logs, view
counters, session data. Say the *property* you need (transactions, throughput,
flexibility), never "it's popular."

### REST vs GraphQL vs gRPC
REST: few, well-known access patterns, one main client type. GraphQL: many
heterogeneous clients (web/mobile/partner) each needing different shapes from a
deeply connected graph — earns its complexity only then. gRPC: internal
service-to-service calls where you control both ends and want low-latency typed
contracts, not public-facing APIs.

### Strong vs eventual consistency (map it per-subsystem, not globally)
Don't pick one CAP point for the whole system — map each subsystem to what it
needs ("polyglot persistence"). Money/inventory/anything where double-processing
is bad → strong consistency, accept some unavailability under partition. Browse/
search/anything read-heavy and tolerant of staleness → stay available, accept lag.

### Push vs pull / real-time delivery
Long polling: cheap, simple, but has a staleness window — fine for low-frequency
updates or legacy client support. SSE: server→client only, HTTP-native, right
choice whenever the client never needs to push data back (live scores, seat maps,
notifications). WebSockets: justified only when you need true bidirectional
streaming (chat, collaborative editing, multiplayer).

### Sync vs async / dual-write vs CDC
Never dual-write from application code to two stores — partial failure leaves them
inconsistent with no clean recovery path. Use Change Data Capture (e.g. Debezium
reading a DB's write-ahead log) to stream changes into a secondary store (search
index, cache, analytics) asynchronously. Primary DB stays source of truth; the
secondary can lag by seconds without correctness risk if it's never used for the
write-path decision itself.

### Caching
Cache read-heavy, staleness-tolerant data (popular item pages, search results)
with a short TTL rather than trying to invalidate precisely on every write.
Never cache the thing that's the actual correctness mechanism (e.g. a seat hold) —
that's a lock/DB state, not a cache.

### Thundering herd / flash-crowd writes
Caching doesn't help — the bottleneck is concurrent *writes* against a small pool,
not reads. Standard fix: a queue (e.g. Redis sorted set by entry timestamp) that
converts an unbounded burst into a rate-limited, ordered admission stream into the
write path, sized to what the DB and lock layer can actually handle.

### Concurrency / avoiding double-processing
A fast in-memory lock (Redis + TTL) is a UX/speed layer, not the correctness
guarantee by itself — it can fail or evict early. The real guarantee is an atomic
conditional operation at the database: `UPDATE ... WHERE id=? AND status='available'`
and checking rows-affected == 1, or a `SELECT ... FOR UPDATE` row lock in a
transaction. State both layers explicitly when asked.

### Idempotency / partial-failure recovery
Any action with side effects that could be retried (payment confirm, booking
confirm) needs an idempotency key tied to the request, so a retry after a timeout
doesn't double-process. Pair with reconciliation against an async source of truth
(e.g. a payment provider's webhook) rather than trusting only the synchronous
response.

### Sharding
Add read replicas before sharding — for most read-heavy systems this absorbs the
bulk of scale on its own. Shard only when a single primary becomes the *write*
bottleneck. Pick a shard key that keeps related writes together so you avoid
cross-shard transactions (e.g. shard a bookings table by event_id, not by user_id,
if bookings never need to join across events).

### Geospatial queries
Geohashing: recursively subdivide the map into a grid, each cell gets a string
(base32 in Elasticsearch); nearby points share a prefix, turning "near me" into a
prefix match instead of computing distance per row. Don't need to implement it —
just name the mechanism if asked how proximity search works.
