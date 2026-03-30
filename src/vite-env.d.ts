/// <reference types="vitest/globals" />

declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T> {}
}

export {};
