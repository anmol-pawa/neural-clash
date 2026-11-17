#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<pair<long long, long long>> v(n);
    for (auto& [l, r] : v) scanf("%lld %lld", &l, &r);
    bool changed = true;
    while (changed) {
        changed = false;
        for (size_t i = 0; i < v.size(); ++i)
            for (size_t j = v.size(); j-- > i + 1;)
                if (v[i].first <= v[j].second + 1 && v[j].first <= v[i].second + 1) {
                    v[i] = {min(v[i].first, v[j].first), max(v[i].second, v[j].second)};
                    v.erase(v.begin() + j);
                    changed = true;
                }
    }
    long long covered = 0;
    for (const auto& [l, r] : v) covered += r - l + 1;
    printf("%zu\n%lld\n", v.size(), covered);
}
