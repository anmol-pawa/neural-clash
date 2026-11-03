#include <bits/stdc++.h>
using namespace std;

// Exhaustive search over every split; only for the small random tests.
int solve(const string& s, size_t pos, const vector<string>& vocab) {
    if (pos == s.size()) return 0;
    int best = INT_MAX / 2;
    for (const auto& piece : vocab)
        if (s.compare(pos, piece.size(), piece) == 0 && pos + piece.size() <= s.size())
            best = min(best, 1 + solve(s, pos + piece.size(), vocab));
    return best;
}

int main() {
    int m;
    scanf("%d", &m);
    vector<string> vocab(m);
    char buf[16];
    for (auto& p : vocab) { scanf("%15s", buf); p = buf; }
    static char text[200005];
    scanf("%200004s", text);
    int ans = solve(text, 0, vocab);
    printf("%d\n", ans >= INT_MAX / 2 ? -1 : ans);
}
