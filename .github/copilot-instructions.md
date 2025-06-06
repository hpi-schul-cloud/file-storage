# Code Style
We never return directly from a function or method call. Instead, we always put the result in a const and give it a descriptive name. This makes the code more readable and debuggable.

Always leave an empty line after a const declaration if the next line is not another const declaration. 
- If you declare a const and the following line is not another const declaration, insert a blank line for readability.
- If you have multiple const declarations in a row, you do not need to add blank lines between them.
- This rule helps keep the code visually organized and easy to scan.

**Apply these instructions not only to new code, but also when editing or reviewing existing code.**

**Example:**
```typescript
const foo = 1;
const bar = 2;

doSomething();

const baz = 3;

if (baz) {
  // ...
}
```

**Bad:**
```typescript
const foo = 1;
const bar = 2;
doSomething();
const baz = 3;
if (baz) {
  // ...
}
```

**Good:**
```typescript
const foo = 1;
const bar = 2;

doSomething();

const baz = 3;

if (baz) {
  // ...
}
```

**Special Rule for Consecutive Mock/Stub/Spy Calls:**
If you have multiple consecutive mock, stub, or spy calls (e.g., `mockResolvedValueOnce`, `mockReturnValueOnce`, etc.) after a const declaration, you must still insert an empty line after the last const declaration and before the first mock/stub/spy call. This ensures the code is visually organized and easy to scan, even when setting up mocks.

**Example:**
```typescript
const { params } = buildFileRecordsWithParams();
const stats = { count: 0, totalSize: 0 };

filesStorageService.getStatsOfParent.mockResolvedValueOnce(stats);
authorizationClientAdapter.checkPermissionsByReference.mockResolvedValueOnce();
```

# Tests
We don't use beforeEach for test setup. Instead, we use a setup function that is called at the beginning of each test. This makes the tests more readable and debuggable.

The setup function **must be placed inside the scenario-level describe block** (the describe block that starts with "when ..."). Do not place the setup function at the top level or outside of a scenario describe block.

On the top level, a describe block can be used to group tests for a specific function or method.  
On the second level, describe blocks must always define a specific scenario that starts with "when".  
An it block is never added without a wrapping describe block with a scenario.

We use an **arrow function** for the setup function.

**Example:**
```typescript
describe('MyService', () => {
  describe('myMethod', () => {
    describe('when some scenario', () => {
      const setup = () => {
        // setup code
        return { /* ... */ };
      };

      it('should do something', () => {
        const { /* ... */ } = setup();
        // test code
      });
    });
  });
});
```

# Factories
Always use the provided entity factory (e.g., fileRecordEntityFactory) to build entities in tests. Do not manually construct entity objects. This ensures correct structure, default values, and consistency across tests.