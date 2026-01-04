export default {
  default: {
    paths: ['features/*.feature'],
    import: ['step_definitions/*.ts'],
    format: ['progress-bar', 'summary', ['html', 'reports/cucumber-report.html']],
    publishQuiet: true,
    loader: ['ts-node/esm']
  }
}
