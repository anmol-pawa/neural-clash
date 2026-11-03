#include <algorithm>
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

// Read n and k, then n token ids. Print the length of the longest contiguous span
// that contains at most k distinct ids.
int main() {
    int n = 0, k = 0;
    cin >> n >> k;
    vector<int> ids(n);
    for (auto& id : ids) cin >> id;
    // TODO: grow a window on the right, shrink it from the left while it has too many distinct ids.
    return 0;
}
