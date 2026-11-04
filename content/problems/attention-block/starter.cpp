#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Read R and C, then R strings of '0'/'1'. Print the area of the largest rectangle of all-'1' cells (0 if none).
int main() {
    int r = 0, c = 0;
    cin >> r >> c;
    vector<string> mask(r);
    for (auto& row : mask) cin >> row;
    // TODO: for each row, how tall is the run of '1's ending there in every column?
    // Then: what is the largest rectangle under that skyline?
    return 0;
}
