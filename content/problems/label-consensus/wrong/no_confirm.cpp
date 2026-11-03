#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    long long candidate = -1;
    int votes = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        scanf("%lld", &x);
        if (votes == 0) candidate = x;
        votes += (x == candidate) ? 1 : -1;
    }
    printf("%lld\n", candidate);  // bug: without a second counting pass the survivor may not be a majority
}
