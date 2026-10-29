def test_get_and_put():
    c = LRUCache(2)
    c.put(1, 10)
    assert c.get(1) == 10
    assert c.get(2) == -1
