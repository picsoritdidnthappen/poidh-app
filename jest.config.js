// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>/'],

  testEnvironment: 'jest-environment-jsdom',

  /**
   * Absolute imports and Module Path Aliases
   */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/public/$1',
    '^.+\\.(svg)$': '<rootDir>/src/__mocks__/svg.tsx',
    // Jest 27 ignores package.json "exports", so map MCP SDK and zod
    // subpaths to their CJS builds
    '^@modelcontextprotocol/sdk/(.*)$':
      '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/cjs/$1',
    '^zod/(v3|v4|v4-mini|v4/core|v4/mini)$':
      '<rootDir>/node_modules/zod/$1/index.cjs',
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
