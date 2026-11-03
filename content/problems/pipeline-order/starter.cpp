#include <iostream>
#include <queue>
#include <vector>
using namespace std;

// Read n, m and the m dependency pairs (a must finish before b).
// Print the lexicographically smallest valid order of stages 1..n, or -1 if there is a cycle.
int main() {
    int n = 0, m = 0;
    cin >> n >> m;
    vector<vector<int>> next(n + 1);
    vector<int> waiting(n + 1, 0);
    for (int i = 0; i < m; ++i) {
        int a = 0, b = 0;
        cin >> a >> b;
        next[a].push_back(b);
        ++waiting[b];
    }
    // TODO: which stages are ready now? What data structure gives you the smallest ready one fast?
    return 0;
}
