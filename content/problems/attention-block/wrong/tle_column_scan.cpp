#include <bits/stdc++.h>
using namespace std;

int main() {
    int r, c;
    scanf("%d %d", &r, &c);
    vector<vector<int>> run(r, vector<int>(c, 0));  // run[i][j]: allowed cells ending at (i,j) in row i
    char buf[2048];
    for (int i = 0; i < r; ++i) {
        scanf("%s", buf);
        for (int j = 0; j < c; ++j) run[i][j] = buf[j] == '1' ? (j ? run[i][j - 1] : 0) + 1 : 0;
    }
    long long best = 0;
    // Correct but slow: for each bottom-right corner scan upward keeping the minimum width. O(R*R*C).
    for (int i = 0; i < r; ++i)
        for (int j = 0; j < c; ++j) {
            int width = INT_MAX;
            for (int k = i; k >= 0 && run[k][j] > 0; --k) {
                width = min(width, run[k][j]);
                best = max<long long>(best, 1LL * width * (i - k + 1));
            }
        }
    printf("%lld\n", best);
}
