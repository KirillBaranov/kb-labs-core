/**
 * Test file for KB Labs preset validation
 */

// BAD: unclear abbreviation (kb-labs naming rule)
function usr_mgr(u: any) {
  return u;
}

// BAD: snake_case instead of camelCase
const my_variable = 'test';

// BAD: single-letter non-index variable
const x = 123;

// BAD: eval usage (security issue)
const code = 'console.log("test")';
// eval(code); // Uncomment to test security rule

// BAD: no-floating-promises
async function getData() {
  return Promise.resolve('data');
}

getData(); // Should warn about floating promise

// GOOD example
function manageUser(user: { id: string; name: string }): { id: string; name: string } {
  return user;
}

const myVariable = 'test';
const MAX_RETRIES = 3;

export { manageUser, myVariable, MAX_RETRIES };
