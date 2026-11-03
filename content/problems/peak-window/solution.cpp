#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> load(n);
    for (auto& x : load) scanf("%lld", &x);
    deque<int> cand;  // indices; their values are strictly decreasing, so the front is the window maximum
    for (int i = 0; i < n; ++i) {
        while (!cand.empty() && load[cand.back()] <= load[i]) cand.pop_back();  // dominated by the newer, larger value
        cand.push_back(i);
        if (cand.front() <= i - k) cand.pop_front();  // front left the window
        if (i >= k - 1) printf(i == k - 1 ? "%lld" : " %lld", load[cand.front()]);
    }
    puts("");
}
