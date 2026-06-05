/**
 * Generate numbers in the Fibonacci sequence.
 *
 * @generator
 * @function fibonacci
 * @yields {number} The next number in the Fibonacci sequence.
 */
 
 function *fibonacci(n) {
  const infinite = !n && n !== 0;
  let current = 0;
  let next = 1;
  
  while (infinite || n--) {
    yield current;
    [current, next] = [next, current + next];
  }
}