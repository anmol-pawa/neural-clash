#include <iostream>
#include <vector>
using namespace std;

// Read n, the n scores, then the parents of nodes 1..n-1 (parent[i] < i).
// Print the largest sum over any path in the tree (a path may start and end anywhere).
int main() {
    int n = 0;
    cin >> n;
    vector<long long> value(n);
    for (auto& x : value) cin >> x;
    vector<int> parent(n, -1);
    for (int i = 1; i < n; ++i) cin >> parent[i];
    // TODO: for each node, what is the best chain that starts there and only goes down?
    // Then ask: if this node is the highest on the path, which two child chains do you join?
    return 0;
}
