#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> load(n);
    for (auto& x : load) scanf("%lld", &x);
    deque<int> cand;
    for (int i = 0; i < n; ++i) {
        while (!cand.empty() && load[cand.back()] <= load[i]) cand.pop_back();
        cand.push_back(i);
        // bug: the front is never evicted when it falls out of the window
        if (i >= k - 1) printf(i == k - 1 ? "%lld" : " %lld", load[cand.front()]);
    }
    puts("");
}
