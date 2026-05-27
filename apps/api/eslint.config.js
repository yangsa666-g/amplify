import tseslint from 'typescript-eslint';

export default [
  {
    // seed-runner.js is a CommonJS bootstrap that must use require().
    ignores: ['dist/', 'node_modules/', 'prisma/seed-runner.js'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Disabled for NestJS: DI tokens and DTOs are referenced only in type
      // positions (constructor params, @Body() args) but must remain *value*
      // imports so emitDecoratorMetadata can emit them at runtime. This rule
      // (and its --fix) would rewrite them to `import type` and break DI.
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': 'off',
    },
  },
];
