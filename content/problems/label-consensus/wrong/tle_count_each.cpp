#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> label(n);
    for (auto& x : label) scanf("%lld", &x);
    for (int i = 0; i < n; ++i) {
        int count = 0;  // bug: counts every label against every other, O(n^2)
        for (int j = 0; j < n; ++j) count += (label[j] == label[i]);
        if (count * 2 > n) { printf("%lld\n", label[i]); return 0; }
    }
    puts("-1");
}
