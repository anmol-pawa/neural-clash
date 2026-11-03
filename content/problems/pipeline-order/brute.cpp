#include <bits/stdc++.h>
using namespace std;

// Try permutations in lexicographic order; the first valid one is the answer. Only for tiny n.
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<pair<int, int>> deps(m);
    for (auto& d : deps) scanf("%d %d", &d.first, &d.second);
    vector<int> perm(n);
    iota(perm.begin(), perm.end(), 1);
    do {
        vector<int> pos(n + 1);
        for (int i = 0; i < n; ++i) pos[perm[i]] = i;
        bool ok = true;
        for (auto& d : deps) ok = ok && pos[d.first] < pos[d.second];
        if (ok) {
            for (int i = 0; i < n; ++i) printf(i ? " %d" : "%d", perm[i]);
            puts("");
            return 0;
        }
    } while (next_permutation(perm.begin(), perm.end()));
    puts("-1");
}
