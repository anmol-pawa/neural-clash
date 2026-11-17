#include <bits/stdc++.h>
using namespace std;

// Repeatedly merge any two joinable ranges until none remain.
int main() {
    int n;
    cin >> n;
    vector<pair<long long, long long>> v(n);
    for (auto& [l, r] : v) cin >> l >> r;
    bool changed = true;
    while (changed) {
        changed = false;
        for (size_t i = 0; i < v.size() && !changed; ++i)
            for (size_t j = i + 1; j < v.size() && !changed; ++j)
                if (v[i].first <= v[j].second + 1 && v[j].first <= v[i].second + 1) {
                    v[i] = {min(v[i].first, v[j].first), max(v[i].second, v[j].second)};
                    v.erase(v.begin() + j);
                    changed = true;
                }
    }
    long long covered = 0;
    for (const auto& [l, r] : v) covered += r - l + 1;
    cout << v.size() << "\n" << covered << "\n";
}
