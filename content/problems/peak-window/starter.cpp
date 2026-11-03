#include <deque>
#include <iostream>
#include <vector>
using namespace std;

// Read n, k and the n readings. Print the maximum of each window of k consecutive readings.
int main() {
    int n = 0, k = 0;
    cin >> n >> k;
    vector<long long> load(n);
    for (auto& x : load) cin >> x;
    // TODO: scanning every window is O(n*k). Which old readings can never be a window maximum again?
    return 0;
}
