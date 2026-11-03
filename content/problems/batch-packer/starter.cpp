#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// Read n and b, then n sequence lengths. Split them, keeping their order, into at most b
// consecutive batches. Print the smallest possible value of the largest batch total.
int main() {
    int n = 0, b = 0;
    cin >> n >> b;
    vector<long long> lengths(n);
    for (auto& x : lengths) cin >> x;
    // TODO: the answer lies between max(lengths) and sum(lengths). How could you test one candidate cheaply?
    return 0;
}
