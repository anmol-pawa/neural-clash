#include <bits/stdc++.h>
using namespace std;

int main() {
    int r, c;
    scanf("%d %d", &r, &c);
    vector<vector<int>> dp(r + 1, vector<int>(c + 1, 0));
    char buf[2048];
    long long best = 0;
    for (int i = 1; i <= r; ++i) {
        scanf("%s", buf);
        for (int j = 1; j <= c; ++j) {
            if (buf[j - 1] != '1') continue;
            dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
            best = max<long long>(best, 1LL * dp[i][j] * dp[i][j]);  // Bug: squares only
        }
    }
    printf("%lld\n", best);
}
