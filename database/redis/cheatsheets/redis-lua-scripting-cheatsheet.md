---
title: "Redis Lua Scripting and Server-Side Programming Cheatsheet"
description: "A comprehensive quick reference for Redis Lua scripting — EVAL, EVALSHA, scripting with redis.call and redis.pcall, atomic patterns, debugging, and production best practices."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Redis Lua Scripting and Server-Side Programming Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Evaluate a Lua script | `EVAL script numkeys [key ...] [arg ...]` | Execute a Lua script on the Redis server |
| Evaluate a cached script | `EVALSHA sha1 numkeys [key ...] [arg ...]` | Execute a script cached with `SCRIPT LOAD` by its SHA1 hash |
| Load a script to cache | `SCRIPT LOAD script` | Upload a script to the script cache and return its SHA1 hash |
| Check script existence | `SCRIPT EXISTS sha1 [sha1 ...]` | Check if one or more scripts exist in the script cache |
| Clear the script cache | `SCRIPT FLUSH [ASYNC\|SYNC]` | Remove all scripts from the script cache |
| Kill a running script | `SCRIPT KILL` | Terminate a currently executing script (if not in a write operation) |
| Debug a script | `redis-cli --ldb --eval script.lua` | Run a script in Redis Lua debugger (interactive, step-through) |
| Call Redis from Lua | `redis.call(command, ...)` | Execute a Redis command — raises a runtime error on failure |
| Call Redis from Lua (no error) | `redis.pcall(command, ...)` | Execute a Redis command — returns `false` on failure instead of raising |
| Return a status reply | `redis.status_reply(message)` | Return a custom status response from a Lua script |
| Log from a Lua script | `redis.log(level, message)` | Write a message to the Redis log file (LOG_DEBUG, LOG_VERBOSE, LOG_NOTICE, LOG_WARNING) |
| Set global variable protection | `redis.setresp(2)` | Switch to RESP2 reply format within a script (Redis 7.0+) |
| Convert Lua table to array | `cjson.encode(table)` | Encode a Lua table as a JSON string for structured returns |
| Parse JSON in Lua | `cjson.decode(json_string)` | Parse a JSON string into a Lua table |

## Common Commands

### Script Evaluation

```bash
# Simple inline script — returns "Hello from Redis!"
EVAL "return 'Hello from Redis!'" 0

# Script with key and argument access
EVAL "return { KEYS[1], ARGV[1] }" 1 mykey myarg

# Script using Redis keys — increment a key and return the new value
EVAL "return redis.call('INCR', KEYS[1])" 1 counter:visits

# Using EVALSHA after loading a script
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returns: "4e6d8fc8bb0126e6b6b7a3b8c9d5f0a1b2c3d4e"
EVALSHA "4e6d8fc8bb0126e6b6b7a3b8c9d5f0a1b2c3d4e" 1 user:profile
```

### Script Management

```bash
# Load a complex script for repeated use
SCRIPT LOAD "local val = redis.call('GET', KEYS[1]); if not val then return nil end; return redis.call('INCRBY', KEYS[1], ARGV[1])"

# Check if a script exists in cache
SCRIPT EXISTS "4e6d8fc8bb0126e6b6b7a3b8c9d5f0a1b2c3d4e"
# => 1) (integer) 1

# Clear the script cache (all scripts must be reloaded)
SCRIPT FLUSH

# Kill a long-running script
SCRIPT KILL
```

### Debugging with Redis Lua Debugger

```bash
# Write script to a file
cat > ~/my_script.lua << 'EOF'
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = redis.call('GET', key) or 0
if current >= limit then
  return 0
end
redis.call('INCR', key)
redis.call('EXPIRE', key, 10)
return 1
EOF

# Run in debug mode (interactive)
redis-cli --ldb --eval ~/my_script.lua rate_limit:user:42 , 5

# Debugger commands: s (step), n (next), c (continue), p (print var), b (break)
```

### Lua Type Mapping

```bash
# Redis reply → Lua type conversion table:
#   Redis Nil       → Lua false
#   Redis Integer   → Lua number
#   Redis String    → Lua string
#   Redis Array     → Lua table (1-indexed)
#   Redis Status    → Lua table with {ok = "message"}
#   Redis Error     → Lua table with {err = "message"}

# Example: handle nil response safely
EVAL "local val = redis.call('GET', KEYS[1]); if val == false then return 'key_not_found' end; return val" 1 user:absent
```

## Code Snippets

### Atomic Compare-And-Swap (CAS)

```lua
-- cas.lua — Atomically update a value only if it matches an expected value
-- Usage: EVALSHA <sha> 1 mykey expected newvalue
local key = KEYS[1]
local expected = ARGV[1]
local newvalue = ARGV[2]

local current = redis.call('GET', key)
if current == expected then
  redis.call('SET', key, newvalue)
  return 1  -- success
end
return 0  -- conflict
```

### Distributed Lock with TTL

```lua
-- acquire_lock.lua — Acquire a distributed lock with automatic expiry
-- KEYS[1] = lock key, ARGV[1] = lock owner ID, ARGV[2] = TTL in seconds
local lock_key = KEYS[1]
local owner = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Try to set the lock only if it doesn't exist
local acquired = redis.call('SET', lock_key, owner, 'NX', 'EX', ttl)
if acquired then
  return 1  -- lock acquired
end

-- Check if the lock is held by the same owner (re-entrant)
local current_owner = redis.call('GET', lock_key)
if current_owner == owner then
  -- Refresh the TTL
  redis.call('EXPIRE', lock_key, ttl)
  return 1  -- lock re-acquired
end

return 0  -- lock held by another owner
```

```lua
-- release_lock.lua — Release a lock only if we own it
-- KEYS[1] = lock key, ARGV[1] = lock owner ID
local lock_key = KEYS[1]
local owner = ARGV[1]

local current = redis.call('GET', lock_key)
if current == owner then
  redis.call('DEL', lock_key)
  return 1  -- lock released
end
return 0  -- not the lock owner, nothing released
```

### Rate Limiter — Sliding Window Counter

```lua
-- rate_limiter.lua — Token bucket rate limiter
-- KEYS[1] = rate limit key, ARGV[1] = max requests, ARGV[2] = window (seconds)
local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if not current then
  -- First request in this window
  redis.call('SET', key, 1, 'EX', window)
  return { allowed = 1, remaining = max_requests - 1 }
end

local count = tonumber(current)
if count >= max_requests then
  return { allowed = 0, remaining = 0 }
end

redis.call('INCR', key)
-- Ensure TTL is set even if the key existed without one
redis.call('EXPIRE', key, window)
return { allowed = 1, remaining = max_requests - count - 1 }
```

### Batch Processing with Pipelines

```lua
-- batch_process.lua — Process multiple keys atomically
-- KEYS = list of keys to process, ARGV[1] = increment amount
local increment = tonumber(ARGV[1])
local results = {}

for i, key in ipairs(KEYS) do
  local exists = redis.call('EXISTS', key)
  if exists == 1 then
    local new_val = redis.call('INCRBY', key, increment)
    table.insert(results, { key = key, new_value = new_val })
  else
    table.insert(results, { key = key, error = 'not_found' })
  end
end

return cjson.encode(results)
```

### Atomic Sorted Set Operations

```lua
-- leaderboard_update.lua — Atomically update a user's score in a leaderboard
-- KEYS[1] = sorted set key, ARGV[1] = member, ARGV[2] = points to add
local leaderboard_key = KEYS[1]
local member = ARGV[1]
local points = tonumber(ARGV[2])

-- Atomically increment the score and get the new rank
local new_score = redis.call('ZINCRBY', leaderboard_key, points, member)
local rank = redis.call('ZREVRANK', leaderboard_key, member)

-- Return both the new score and rank in one atomic operation
return {
  member = member,
  new_score = new_score,
  new_rank = rank + 1  -- ZREVRANK is 0-based, convert to 1-based
}
```

### Bloom Filter with Lua (Memory-Efficient Membership)

```lua
-- bloom_check.lua — Simple bloom-filter-like membership check with Lua
-- KEYS[1] = set key, ARGV[1] = candidate member, ARGV[2] = max size
local key = KEYS[1]
local candidate = ARGV[1]
local max_size = tonumber(ARGV[2])

-- Check membership using a HyperLogLog or just a set
local exists = redis.call('SISMEMBER', key, candidate)
if exists == 0 then
  -- Only add if under max capacity
  local current_size = redis.call('SCARD', key)
  if current_size < max_size then
    redis.call('SADD', key, candidate)
    return { known = 0, added = 1, size = current_size + 1 }
  end
  return { known = 0, added = 0, size = current_size, reason = 'at_capacity' }
end
return { known = 1, added = 0, size = false }
```

### Safe Key Deletion with Pattern

```lua
-- safe_cleanup.lua — Delete keys matching a pattern in batches (SCAN-based)
-- KEYS[1] = pattern (e.g., "session:*"), ARGV[1] = batch size
local pattern = KEYS[1]
local batch_size = tonumber(ARGV[1]) or 100
local cursor = '0'
local deleted = 0

repeat
  local scan_result = redis.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', batch_size)
  cursor = scan_result[1]
  local keys = scan_result[2]

  if #keys > 0 then
    deleted = deleted + #keys
    redis.call('DEL', unpack(keys))
  end
until cursor == '0'

return { deleted = deleted, pattern = pattern }
```

### Lua Error Handling Patterns

```lua
-- Safe get with default value
-- Returns a default value when key doesn't exist (without raising errors)
local function safe_get(key, default)
  local val = redis.pcall('GET', key)
  if val == false then
    return default
  end
  return val
end

-- Transactional transfer between two keys
-- Uses redis.pcall so we can handle errors gracefully
local function atomic_transfer(from_key, to_key, amount)
  -- Try to get the source value
  local from_val = redis.pcall('GET', from_key)
  if from_val == false then
    return { ok = 0, error = 'source_key_not_found' }
  end

  local from_num = tonumber(from_val)
  if not from_num or from_num < amount then
    return { ok = 0, error = 'insufficient_funds' }
  end

  redis.call('DECRBY', from_key, amount)
  redis.call('INCRBY', to_key, amount)
  return { ok = 1, from_remaining = from_num - amount }
end

-- Usage:
-- EVAL "local function safe_get(k, d) local v=redis.pcall('GET',k); if v==false then return d end; return v end; return safe_get(KEYS[1], ARGV[1])" 1 config:theme "dark"
```

### Script Execution Time and Performance

```lua
-- All Redis Lua scripts have a default execution time limit of 5 seconds
-- (controlled by the `lua-time-limit` config in redis.conf)

-- Bad: O(n) loop over a large set will block Redis
-- EVAL "local members = redis.call('SMEMBERS', KEYS[1]); local r=''; for i,m in ipairs(members) do r=r..m end; return r" 1 huge_set

-- Good: Use SCAN-based iteration with yield points
-- (Redis 7.0+ allows yielding between iterations)
local cursor = '0'
local result = {}
repeat
  local scan_result = redis.call('SCAN', cursor, 'MATCH', KEYS[1], 'COUNT', 100)
  cursor = scan_result[1]
  for _, key in ipairs(scan_result[2]) do
    table.insert(result, redis.call('GET', key))
  end
until cursor == '0'

return result
```

### JSON Module Integration (RedisJSON)

```lua
-- When the RedisJSON module is loaded, access JSON documents from Lua
-- Requires: Redis Stack or redisjson module loaded

-- Get a JSON path value atomically
local function json_get_atomic(key, path)
  local exists = redis.call('EXISTS', key)
  if exists == 0 then
    return cjson.encode({ error = 'key_not_found' })
  end
  local val = redis.call('JSON.GET', key, path)
  return val
end

-- Atomically increment a numeric field in a JSON document
local function json_increment_field(key, path, amount)
  local current = redis.call('JSON.GET', key, path)
  if not current then
    return cjson.encode({ error = 'path_not_found' })
  end
  local num = tonumber(current)
  local new_val = num + (tonumber(amount) or 1)
  redis.call('JSON.SET', key, path, tostring(new_val))
  return cjson.encode({ new_value = new_val })
end
```

### Best Practices Summary

```text
1. Always name KEYS and ARGV descriptively in script comments.
2. Pass key names as KEYS[], not hardcoded — enables cluster-compatible scripts.
3. Use redis.pcall() instead of redis.call() when you want to handle errors gracefully.
4. Keep scripts short (under 100 lines) — long scripts block the Redis event loop.
5. Use SCRIPT LOAD + EVALSHA for scripts run frequently (reduces bandwidth).
6. Never do expensive O(n) operations on large collections inside scripts.
7. Test scripts with redis-cli --ldb before deploying to production.
8. Scripts are deterministic — same inputs must produce same outputs.
9. Use cjson.encode() for returning structured data from scripts.
10. Avoid global variable access in Lua scripts — use local everywhere.
```
