#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    map<long long, int> count;
    for (int i = 0; i < n; ++i) {
        long long id;
        cin >> id;
        ++count[id];
    }
    vector<pair<int, long long>> all;
    for (const auto& [id, c] : count) all.push_back({-c, id});
    sort(all.begin(), all.end());
    for (int i = 0; i + 1 < k; ++i) cout << (i ? " " : "") << all[i].second;
    cout << "\n";
}
