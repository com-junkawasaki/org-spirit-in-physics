<script lang="ts">
  import { page } from "$app/state";
  import * as m from "$lib/paraglide/messages.js";
</script>

<div class="error-container">
  <div class="error-content">
    <h1 class="error-code">404</h1>
    <h2 class="error-title">{m.page_not_found()}</h2>
    <p class="error-message">
      {m.page_not_found_desc()}
    </p>
    <a href="/" class="home-link">
      {m.go_to_home()}
    </a>
  </div>
</div>

<style>
  .error-container {
    height: calc(100vh - 64px);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f7;
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-code {
    font-size: 8rem;
    font-weight: 800;
    margin: 0;
    line-height: 1;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0.2;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: -1rem;
    color: #1d1d1f;
  }

  .error-message {
    color: #86868b;
    margin: 1.5rem 0 2.5rem;
    line-height: 1.6;
  }

  .home-link {
    display: inline-block;
    background: #007aff;
    color: white;
    text-decoration: none;
    padding: 0.8rem 2rem;
    border-radius: 24px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .home-link:hover {
    background: #0066cc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
  }
</style>

