#include <algorithm>
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

// Read n and k, then n token ids. Print the k most frequent ids on one line:
// highest count first, and the smaller id first when counts tie.
int main() {
    int n = 0, k = 0;
    cin >> n >> k;
    vector<long long> ids(n);
    for (auto& id : ids) cin >> id;
    // TODO: count, select the top k, print them separated by spaces.
    return 0;
}
