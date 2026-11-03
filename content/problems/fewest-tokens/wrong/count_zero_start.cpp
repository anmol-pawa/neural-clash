#include <bits/stdc++.h>
using namespace std;

int main() {
    int m;
    scanf("%d", &m);
    unordered_set<string> vocab;
    size_t longest = 0;
    char buf[16];
    for (int i = 0; i < m; ++i) { scanf("%15s", buf); vocab.insert(buf); longest = max(longest, strlen(buf)); }
    static char text[200005];
    scanf("%200004s", text);
    const string s = text;
    const int n = static_cast<int>(s.size());
    vector<int> best(n + 1, 0);  // bug: unreachable prefixes start at 0 instead of "infinity"
    for (int i = 1; i <= n; ++i) {
        int cur = INT_MAX / 2;
        for (size_t len = 1; len <= longest && len <= static_cast<size_t>(i); ++len)
            if (vocab.count(s.substr(i - len, len))) cur = min(cur, best[i - len] + 1);
        best[i] = cur >= INT_MAX / 2 ? 0 : cur;
    }
    printf("%d\n", best[n] == 0 ? -1 : best[n]);
}
