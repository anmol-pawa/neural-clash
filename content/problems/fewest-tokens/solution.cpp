#include <bits/stdc++.h>
using namespace std;

int main() {
    int m;
    scanf("%d", &m);
    unordered_set<string> vocab;
    size_t longest = 0;
    char buf[16];
    for (int i = 0; i < m; ++i) {
        scanf("%15s", buf);
        vocab.insert(buf);
        longest = max(longest, strlen(buf));
    }
    static char text[200005];
    scanf("%200004s", text);
    const string s = text;
    const int n = static_cast<int>(s.size());
    const int INF = INT_MAX / 2;
    vector<int> best(n + 1, INF);  // best[i] = fewest pieces that spell the first i characters
    best[0] = 0;
    for (int i = 1; i <= n; ++i) {
        for (size_t len = 1; len <= longest && len <= static_cast<size_t>(i); ++len) {
            if (best[i - len] < INF && vocab.count(s.substr(i - len, len)))
                best[i] = min(best[i], best[i - len] + 1);
        }
    }
    printf("%d\n", best[n] >= INF ? -1 : best[n]);
}
