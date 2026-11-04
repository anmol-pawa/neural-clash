#include <bits/stdc++.h>
using namespace std;

// Every rectangle checked with a 2D prefix sum of allowed cells: O(R^2 C^2), the specification for small tests.
int main() {
    int r, c;
    scanf("%d %d", &r, &c);
    vector<string> g(r);
    char buf[2048];
    for (auto& s : g) { scanf("%s", buf); s = buf; }
    vector<vector<int>> pre(r + 1, vector<int>(c + 1, 0));
    for (int i = 0; i < r; ++i)
        for (int j = 0; j < c; ++j)
            pre[i + 1][j + 1] = pre[i][j + 1] + pre[i + 1][j] - pre[i][j] + (g[i][j] == '1');
    long long best = 0;
    for (int a = 0; a < r; ++a)
        for (int b = a; b < r; ++b)
            for (int x = 0; x < c; ++x)
                for (int y = x; y < c; ++y) {
                    const int area = (b - a + 1) * (y - x + 1);
                    const int ones = pre[b + 1][y + 1] - pre[a][y + 1] - pre[b + 1][x] + pre[a][x];
                    if (ones == area) best = max<long long>(best, area);
                }
    printf("%lld\n", best);
}
