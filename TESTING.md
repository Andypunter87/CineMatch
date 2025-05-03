# CineMatch Testing Guide

This document provides guidance on testing the CineMatch application. We've set up a comprehensive testing framework using Jest and React Testing Library to ensure code quality and reliability.

## Test Structure

Tests are organized in the following directories:

- `client/src/test/__tests__`: Unit and integration tests
- `client/src/test/mocks`: Mock data and API handlers
- `client/src/test/test-utils.tsx`: Testing utilities and custom render functions

## Running Tests

You can run tests using the provided shell script:

```bash
# Run all tests
./run-tests.sh

# Run tests in watch mode
./run-tests.sh --watch

# Run tests with coverage reports
./run-tests.sh --coverage

# Run specific tests
./run-tests.sh client/src/test/__tests__/api-client.test.ts
```

## Testing Approach

### Unit Tests

Unit tests focus on isolated components and functions to ensure they work correctly in isolation. Example:

```typescript
// Testing a utility function
describe('formatStreamingServices', () => {
  it('should format streaming service names correctly', () => {
    expect(formatStreamingServices(['netflix'])).toBe('Netflix');
    expect(formatStreamingServices(['netflix', 'hulu'])).toBe('Netflix, Hulu');
  });
});
```

### Integration Tests

Integration tests verify that different parts of the application work together correctly. Example:

```typescript
// Testing the recommendation form submission flow
it('should fetch and display recommendations when form is submitted', async () => {
  render(<RecommendationPage />);
  fireEvent.click(screen.getByTestId('submit-button'));
  await waitFor(() => {
    expect(screen.getByTestId('recommendation-results')).toBeInTheDocument();
  });
});
```

### API Mocking

We use MSW (Mock Service Worker) to intercept API requests during tests. The mock handlers are defined in `client/src/test/mocks/handlers.ts`.

To override a handler for a specific test:

```typescript
server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ customData: true });
  })
);
```

## Test Coverage

We aim for high test coverage, focusing on:

1. Core business logic (recommendation engine, film matching)
2. Error handling and edge cases
3. User flows (onboarding, authentication, film discovery)
4. Component rendering and interactions

## Best Practices

1. **Use the test utilities**: Always use the custom render function from `test-utils.tsx` which provides all necessary providers.
2. **Test user behavior**: Focus on testing what the user experiences, not implementation details.
3. **Avoid redundant tests**: Don't test third-party libraries, focus on your own code.
4. **Keep tests isolated**: Each test should be independent and not rely on state from other tests.
5. **Use descriptive test names**: Test names should clearly describe what's being tested.

## Writing New Tests

When adding new features, create corresponding test files in the `client/src/test/__tests__` directory following the naming convention `[feature].test.tsx`.

For complex components, consider breaking tests into logical groups:

```typescript
describe('RecommendationForm', () => {
  describe('Form Validation', () => {
    // Tests for form validation
  });
  
  describe('Form Submission', () => {
    // Tests for form submission
  });
});
```

## Error Handling Testing

CineMatch implements a multi-layered error handling system. When testing error scenarios:

1. Test each layer of error handling (API, component, global boundary)
2. Verify proper fallback UI is displayed
3. Check that error is logged or reported appropriately
4. Ensure recovery mechanisms work correctly

## Core Features to Test

1. **Authentication Flow**: Login, logout, registration, authentication state
2. **Onboarding Process**: Steps completion, user preferences saving
3. **Recommendation Engine**: Accurate recommendations based on filters
4. **Film Rating System**: Rating storage and impact on recommendations
5. **Watchlist Management**: Adding, removing, and updating watchlist items
6. **Friend System**: Friend requests, viewing party creation
7. **Error Handling**: Proper error display and recovery