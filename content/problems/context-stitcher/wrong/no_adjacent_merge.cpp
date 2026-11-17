#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<pair<long long, long long>> chunks(n);
    for (auto& [l, r] : chunks) scanf("%lld %lld", &l, &r);
    sort(chunks.begin(), chunks.end());
    long long ranges = 0, covered = 0;
    long long curL = chunks[0].first, curR = chunks[0].second;
    for (int i = 1; i < n; ++i) {
        const auto& [l, r] = chunks[i];
        if (l <= curR) {
            curR = max(curR, r);  // overlaps or touches the open range: extend it
        } else {
            ++ranges;
            covered += curR - curL + 1;
            curL = l;
            curR = r;
        }
    }
    ++ranges;
    covered += curR - curL + 1;
    printf("%lld\n%lld\n", ranges, covered);
}
