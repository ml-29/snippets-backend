// Factorial.java
public class Factorial {
    public static void main(String[] args) {
        int n = 5; // Change n to any positive integer
        int result = 1;
        for (int i = 1; i <= n; i++) {
            result *= i;
        }
        System.out.println("Factorial of " + n + " is: " + result);
    }
}