#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> label(n);
    for (auto& x : label) scanf("%lld", &x);
    // Boyer-Moore vote: a strict majority label survives pairing off distinct labels.
    long long candidate = -1;
    int votes = 0;
    for (long long x : label) {
        if (votes == 0) candidate = x;
        votes += (x == candidate) ? 1 : -1;
    }
    // The vote only names the only possible winner; confirm it really has more than half.
    int count = 0;
    for (long long x : label) count += (x == candidate);
    printf("%lld\n", count * 2 > n ? candidate : -1LL);
}
