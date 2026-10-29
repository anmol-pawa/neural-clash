from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity):
        self._capacity = capacity
        self._items = OrderedDict()

    def get(self, key):
        return self._items.get(key, -1)

    def put(self, key, value):
        if key in self._items:
            self._items.move_to_end(key)
        self._items[key] = value
        if len(self._items) > self._capacity:
            self._items.popitem(last=False)
