#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> next(n + 1);
    vector<int> waiting(n + 1, 0);
    for (int i = 0; i < m; ++i) {
        int a, b;
        scanf("%d %d", &a, &b);
        next[a].push_back(b);
        ++waiting[b];
    }
    vector<char> done(n + 1, 0);
    vector<int> order;
    for (int step = 0; step < n; ++step) {
        int pick = -1;
        for (int v = 1; v <= n; ++v)  // bug: O(n) scan per step, O(n^2) overall
            if (!done[v] && waiting[v] == 0) { pick = v; break; }
        if (pick < 0) { puts("-1"); return 0; }
        done[pick] = 1;
        order.push_back(pick);
        for (int w : next[pick]) --waiting[w];
    }
    for (int i = 0; i < n; ++i) printf(i ? " %d" : "%d", order[i]);
    puts("");
}
