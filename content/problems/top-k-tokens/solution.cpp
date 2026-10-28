#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    unordered_map<long long, int> count;
    count.reserve(n * 2);
    for (int i = 0; i < n; ++i) {
        long long id;
        scanf("%lld", &id);
        ++count[id];
    }
    // "worse" token = lower count, or equal count and larger id; the heap keeps the worst on top.
    auto worse = [](const pair<int, long long>& a, const pair<int, long long>& b) {
        return a.first != b.first ? a.first > b.first : a.second < b.second;
    };
    priority_queue<pair<int, long long>, vector<pair<int, long long>>, decltype(worse)> heap(worse);
    for (const auto& [id, c] : count) {
        heap.push({c, id});
        if (static_cast<int>(heap.size()) > k) heap.pop();
    }
    vector<long long> best;
    while (!heap.empty()) {
        best.push_back(heap.top().second);
        heap.pop();
    }
    reverse(best.begin(), best.end());
    for (size_t i = 0; i < best.size(); ++i) printf(i ? " %lld" : "%lld", best[i]);
    printf("\n");
}
