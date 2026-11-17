#include <bits/stdc++.h>
using namespace std;

// Largest rectangle in a histogram: a stack of column indices with strictly increasing heights.
// The sentinel height 0 at index C flushes the stack.
static long long largestInHistogram(const vector<int>& h) {
    const int c = static_cast<int>(h.size());
    vector<int> stack;
    stack.reserve(c + 1);
    long long best = 0;
    for (int i = 0; i <= c; ++i) {
        const int cur = (i == c) ? 0 : h[i];
        while (!stack.empty() && h[stack.back()] >= cur) {
            const long long height = h[stack.back()];
            stack.pop_back();
            const int left = stack.empty() ? -1 : stack.back();  // first column to the left that is shorter
            best = max(best, height * (i - left - 1));
        }
        stack.push_back(i);
    }
    return best;
}

int main() {
    int r, c;
    scanf("%d %d", &r, &c);
    vector<int> heights(c, 0);
    vector<char> row(c + 2);
    long long best = 0;
    for (int i = 0; i < r; ++i) {
        scanf("%s", row.data());
        for (int j = 0; j < c; ++j) heights[j] = (row[j] == '1') ? heights[j] + 1 : 0;
        best = max(best, largestInHistogram(heights));
    }
    printf("%lld\n", best);
}
