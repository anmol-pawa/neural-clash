#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

// Read n chunks [l, r]. Stitch chunks that overlap or touch (next l <= current r + 1).
// Print the number of stitched ranges, then the total number of covered positions.
int main() {
    int n = 0;
    cin >> n;
    vector<pair<long long, long long>> chunks(n);
    for (auto& [l, r] : chunks) cin >> l >> r;
    // TODO: sort, sweep, print the count and the covered total on two lines.
    return 0;
}
