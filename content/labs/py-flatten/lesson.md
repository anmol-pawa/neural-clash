# Flatten nested lists

Flatten arbitrarily nested lists and tuples into one list, left to right. Strings are leaves, not containers.

**Interview signal:** recursion with a clear base case, the `str` trap (a one-character string iterates to itself forever), and the follow-up "what if nesting is 100,000 deep?" which wants an explicit stack.
