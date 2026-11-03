#include <iostream>
#include <vector>
using namespace std;

// Read n, then n lines "gain left right" (-1 = no child). Children have larger indices than their parent.
// Print the largest sum of gains over any path in the tree.
int main() {
    int n = 0;
    cin >> n;
    vector<long long> gain(n);
    vector<int> left(n), right(n);
    for (int v = 0; v < n; ++v) cin >> gain[v] >> left[v] >> right[v];
    // TODO: a best path has a highest node. What two downward chains can hang off it?
    // Hint: a loop from n-1 down to 0 sees every child before its parent.
    return 0;
}
