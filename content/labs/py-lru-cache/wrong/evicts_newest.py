from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity):
        self._capacity = capacity
        self._items = OrderedDict()

    def get(self, key):
        if key not in self._items:
            return -1
        self._items.move_to_end(key)
        return self._items[key]

    def put(self, key, value):
        if key in self._items:
            self._items.move_to_end(key)
        self._items[key] = value
        if len(self._items) > self._capacity:
            self._items.popitem()
