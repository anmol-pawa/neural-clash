#include <iostream>
#include <vector>
using namespace std;

// Read n, then for services 1..n-1 the parent p[i] (p[i] < i) and the latency w[i] to it.
// Print the largest total latency between any two services.
int main() {
    int n = 0;
    cin >> n;
    vector<int> parent(n, -1);
    vector<long long> weight(n, 0);
    for (int i = 1; i < n; ++i) cin >> parent[i] >> weight[i];
    // TODO: every parent has a smaller index than its child. What does that let you do without recursion?
    // Think about the best downward path from each node, and how a path bends at its highest node.
    return 0;
}
