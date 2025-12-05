export default [
  {
    rules: {
      // 再エクスポートを禁止
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Re-exports (export * from) are not allowed. Please use named exports instead.',
        },
      ],
    },
  },
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  }
];
