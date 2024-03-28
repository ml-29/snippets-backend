// reverse_string.cpp
#include <iostream>
#include <string>
using namespace std;

string reverseString(string str) {
    string reversed = "";
    for (int i = str.length() - 1; i >= 0; i--) {
        reversed += str[i];
    }
    return reversed;
}

int main() {
    string input = "Hello, World!";
    string reversed = reverseString(input);
    cout << "Reversed string: " << reversed << endl;
    return 0;
}
