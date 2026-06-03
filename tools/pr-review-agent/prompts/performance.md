Performance inspection checklist:

- No accidental N+1 database or API calls.
- No unbounded loops over large datasets in request paths.
- Expensive work has caching, pagination, batching, or background processing where needed.
- New queries and indexes are appropriate for expected data volume.
- Frontend changes avoid unnecessary re-renders and oversized payloads.
