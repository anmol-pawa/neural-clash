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
    size_t pos = 0;
    int pieces = 0;
    while (pos < s.size()) {
        size_t take = 0;
        // bug: always takes the longest piece that matches here, which can strand the rest of the text
        for (size_t len = min(longest, s.size() - pos); len >= 1; --len)
            if (vocab.count(s.substr(pos, len))) { take = len; break; }
        if (!take) { puts("-1"); return 0; }
        pos += take;
        ++pieces;
    }
    printf("%d\n", pieces);
}
