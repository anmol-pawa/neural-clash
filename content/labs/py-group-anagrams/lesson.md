# Group anagrams

Group words that are anagrams of each other. Return the groups with each group sorted, and the list of groups sorted by its first word.

**Interview signal:** a canonical key (`"".join(sorted(word))`) into a `defaultdict(list)`. Compare the sorted-key cost O(L log L) against a 26-count tuple key O(L) when the alphabet is small.
