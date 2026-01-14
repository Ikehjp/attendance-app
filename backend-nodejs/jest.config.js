module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['./tests/setup.js']
};
