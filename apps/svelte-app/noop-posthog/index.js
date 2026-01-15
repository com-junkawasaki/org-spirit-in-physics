class PostHog {
  constructor() {
    console.log('PostHog mock initialized');
  }
  capture() {}
  identify() {}
  alias() {}
  group() {}
  page() {}
  screen() {}
  reloadFeatureFlags() { return Promise.resolve(); }
  isFeatureEnabled() { return false; }
  getFeatureFlag() { return null; }
  getFeatureFlags() { return {}; }
  getAllFlags() { return {}; }
  shutdown() { return Promise.resolve(); }
  flush() { return Promise.resolve(); }
  on() {}
}

module.exports = { PostHog };

