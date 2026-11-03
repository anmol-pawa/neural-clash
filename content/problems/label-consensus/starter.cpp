#include <iostream>
#include <vector>
using namespace std;

// Read n and the n labels. Print the label given by strictly more than n / 2 annotators, or -1.
int main() {
    int n = 0;
    cin >> n;
    vector<long long> label(n);
    for (auto& x : label) cin >> x;
    // TODO: counting every label against every other is O(n^2). Can you find the only possible winner in one pass?
    return 0;
}
