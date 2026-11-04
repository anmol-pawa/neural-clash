#include <iostream>
#include <set>
#include <vector>
using namespace std;

// Read n, k and the n latencies. Print the lower median of each window of k consecutive values.
int main() {
    int n = 0, k = 0;
    cin >> n >> k;
    vector<long long> latency(n);
    for (auto& x : latency) cin >> x;
    // TODO: sorting every window is O(n*k*log k). Which container keeps a changing set sorted,
    // and can one iterator track the median as the window slides?
    return 0;
}
