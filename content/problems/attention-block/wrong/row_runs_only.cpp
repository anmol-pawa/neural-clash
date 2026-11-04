#include <bits/stdc++.h>
using namespace std;

int main() {
    int r, c;
    scanf("%d %d", &r, &c);
    vector<int> height(c, 0);
    char buf[2048];
    long long best = 0;
    for (int i = 0; i < r; ++i) {
        scanf("%s", buf);
        int run = 0;
        for (int j = 0; j < c; ++j) {
            height[j] = buf[j] == '1' ? height[j] + 1 : 0;
            run = buf[j] == '1' ? run + 1 : 0;
            // Bug: only a single row's run, or a single column's height. Rectangles taller and wider than 1 are missed.
            best = max<long long>(best, max(run, height[j]));
        }
    }
    printf("%lld\n", best);
}
