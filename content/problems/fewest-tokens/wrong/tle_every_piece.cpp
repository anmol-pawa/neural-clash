#include <bits/stdc++.h>
using namespace std;

int main() {
    int m;
    scanf("%d", &m);
    vector<string> vocab(m);
    char buf[16];
    for (auto& p : vocab) { scanf("%15s", buf); p = buf; }
    static char text[200005];
    scanf("%200004s", text);
    const string s = text;
    const int n = static_cast<int>(s.size());
    const int INF = INT_MAX / 2;
    vector<int> best(n + 1, INF);
    best[0] = 0;
    for (int i = 1; i <= n; ++i)
        for (const auto& piece : vocab) {  // bug: tries all m pieces at every position, O(n * m * len)
            const int len = static_cast<int>(piece.size());
            if (len <= i && best[i - len] < INF && s.compare(i - len, len, piece) == 0)
                best[i] = min(best[i], best[i - len] + 1);
        }
    printf("%d\n", best[n] >= INF ? -1 : best[n]);
}
