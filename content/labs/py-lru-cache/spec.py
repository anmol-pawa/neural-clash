"""Starter file shown to the player."""


class LRUCache:
    def __init__(self, capacity):
        raise NotImplementedError

    def get(self, key):
        """Return the value, or -1 if absent. Marks the key as recently used."""
        raise NotImplementedError

    def put(self, key, value):
        """Insert or update. Evict the least recently used key if over capacity."""
        raise NotImplementedError
