#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>
using namespace std;

// Read m, the m vocabulary pieces, then the text s.
// Print the fewest pieces that spell s exactly, or -1 if it cannot be split.
int main() {
    int m = 0;
    cin >> m;
    unordered_set<string> vocab;
    for (int i = 0; i < m; ++i) { string piece; cin >> piece; vocab.insert(piece); }
    string s;
    cin >> s;
    // TODO: taking the longest matching piece first is tempting. Can you find a text where it gets stuck?
    // Think about "the best answer for each prefix of s".
    return 0;
}
