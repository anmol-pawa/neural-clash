#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<vector<int>> next(n + 1);
    vector<int> waiting(n + 1, 0);  // unfinished prerequisites per stage (duplicate pairs count twice)
    for (int i = 0; i < m; ++i) {
        int a, b;
        scanf("%d %d", &a, &b);
        next[a].push_back(b);
        ++waiting[b];
    }
    priority_queue<int, vector<int>, greater<int>> ready;  // min-heap: smallest ready label first
    for (int v = 1; v <= n; ++v)
        if (waiting[v] == 0) ready.push(v);
    vector<int> order;
    order.reserve(n);
    while (!ready.empty()) {
        int v = ready.top();
        ready.pop();
        order.push_back(v);
        for (int w : next[v])
            if (--waiting[w] == 0) ready.push(w);
    }
    if ((int)order.size() < n) {  // some stages sit on a cycle and never became ready
        puts("-1");
        return 0;
    }
    for (int i = 0; i < n; ++i) printf(i ? " %d" : "%d", order[i]);
    puts("");
}
