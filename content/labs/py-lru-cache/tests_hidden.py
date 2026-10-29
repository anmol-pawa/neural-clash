def test_evicts_least_recently_used():
    c = LRUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    c.put(3, 3)
    assert c.get(1) == -1
    assert c.get(2) == 2 and c.get(3) == 3


def test_get_refreshes_recency():
    c = LRUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    assert c.get(1) == 1
    c.put(3, 3)
    assert c.get(2) == -1
    assert c.get(1) == 1


def test_put_existing_updates_value_and_recency():
    c = LRUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    c.put(1, 100)
    c.put(3, 3)
    assert c.get(1) == 100
    assert c.get(2) == -1


def test_update_does_not_grow_the_cache():
    c = LRUCache(1)
    c.put(1, 1)
    c.put(1, 2)
    assert c.get(1) == 2


def test_capacity_one():
    c = LRUCache(1)
    c.put(1, 1)
    c.put(2, 2)
    assert c.get(1) == -1 and c.get(2) == 2


def test_many_operations_stay_fast():
    c = LRUCache(1000)
    for i in range(200_000):
        c.put(i, i)
        c.get(i - 500)
    assert c.get(199_999) == 199_999 and c.get(0) == -1


def test_a_stored_falsy_value_is_not_a_miss():
    c = LRUCache(2)
    c.put("a", 0)
    assert c.get("a") == 0
