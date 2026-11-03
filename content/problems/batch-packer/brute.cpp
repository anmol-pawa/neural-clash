#include <bits/stdc++.h>
using namespace std;

// dp[j][i] = best (smallest) max-batch-sum splitting the first i sequences into j batches.
int main() {
    int n, b;
    cin >> n >> b;
    vector<long long> len(n), pre(n + 1, 0);
    for (int i = 0; i < n; ++i) {
        cin >> len[i];
        pre[i + 1] = pre[i] + len[i];
    }
    const long long INF = LLONG_MAX / 2;
    vector<vector<long long>> dp(b + 1, vector<long long>(n + 1, INF));
    dp[0][0] = 0;
    for (int j = 1; j <= b; ++j)
        for (int i = 1; i <= n; ++i)
            for (int p = 0; p < i; ++p)
                if (dp[j - 1][p] < INF) dp[j][i] = min(dp[j][i], max(dp[j - 1][p], pre[i] - pre[p]));
    long long best = INF;
    for (int j = 1; j <= b; ++j) best = min(best, dp[j][n]);
    cout << best << "\n";
}
