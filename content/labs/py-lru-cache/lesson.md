# LRU cache

`LRUCache(capacity)` with `get(key)` (returns `-1` when absent) and `put(key, value)`. Both are O(1). Reading or writing a key makes it the most recently used. Inserting past capacity evicts the least recently used key.

**Interview signal:** `collections.OrderedDict` with `move_to_end` and `popitem(last=False)` is accepted in most loops; be ready to explain the hash map plus doubly linked list underneath.
