<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
</script>

<svelte:head>
  <title>Support | Spirit in Physics</title>
</svelte:head>

<div class="support-page">
  <div class="container">
    <h1>Support</h1>

    <section class="section">
      <h2>Contact Information</h2>
      <div class="contact-card">
        <div class="contact-item">
          <span class="label">Email:</span>
          <a href="mailto:jun784@gmail.com">jun784@gmail.com</a>
        </div>
        <div class="contact-item">
          <span class="label">Phone:</span>
          <a href="tel:+81-80-4280-1991">+81-80-4280-1991</a>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Research Institution</h2>
      <div class="institution-card">
        <h3>Niigata University Brain Research Institute</h3>
        <p>Systems Brain Pathology Laboratory (Tainaka Lab)</p>
        <p>Phone: 025-227-0900</p>
        <p>Email: <a href="mailto:kztainaka@bri.niigata-u.ac.jp">kztainaka@bri.niigata-u.ac.jp</a></p>
      </div>
    </section>

    <section class="section">
      <h2>Frequently Asked Questions</h2>

      <div class="faq-item">
        <h3>What is Spirit in Physics?</h3>
        <p>Spirit in Physics is a research platform that uses Jungian word association experiments to measure and visualize human "spirit" as a thermodynamic information quantity.</p>
      </div>

      <div class="faq-item">
        <h3>How long does the experiment take?</h3>
        <p>The experiment consists of two sessions of 100 words each. The total time is approximately 15-20 minutes.</p>
      </div>

      <div class="faq-item">
        <h3>Why do you need camera and microphone access?</h3>
        <p>The camera is used to measure facial expressions using Hume AI technology. The microphone records your verbal responses for speech recognition. Both are essential for the research data collection.</p>
      </div>

      <div class="faq-item">
        <h3>How is my data protected?</h3>
        <p>All data is anonymized and stored securely. The research complies with ICH-GCP standards and has been approved by the Niigata University Ethics Committee (Approval number: 2024-0269).</p>
      </div>

      <div class="faq-item">
        <h3>Can I withdraw from the study?</h3>
        <p>Yes, participation is completely voluntary. You may withdraw at any time without providing a reason, and this will not result in any disadvantages.</p>
      </div>
    </section>

    <section class="section">
      <h2>Technical Support</h2>
      <p>If you experience technical issues with the app:</p>
      <ul>
        <li>Ensure you have a stable internet connection</li>
        <li>Grant camera and microphone permissions when prompted</li>
        <li>Use a modern browser (Chrome, Safari, Firefox)</li>
        <li>Try refreshing the page if the app becomes unresponsive</li>
      </ul>
      <p>For persistent issues, please contact us at <a href="mailto:jun784@gmail.com">jun784@gmail.com</a>.</p>
    </section>
  </div>
</div>

<style>
  .support-page {
    min-height: 100vh;
    padding: 2rem;
    background: var(--background, #fff);
    color: var(--foreground, #000);
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 900;
    margin-bottom: 2rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    border-bottom: 2px solid currentColor;
    padding-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .section {
    margin-bottom: 3rem;
  }

  .contact-card,
  .institution-card {
    background: var(--card, #f5f5f5);
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  :global(.dark) .contact-card,
  :global(.dark) .institution-card {
    background: #1a1a1a;
  }

  .contact-item {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .label {
    font-weight: 600;
    min-width: 60px;
  }

  .faq-item {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--card, #f5f5f5);
    border-radius: 8px;
  }

  :global(.dark) .faq-item {
    background: #1a1a1a;
  }

  a {
    color: #2563eb;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  :global(.dark) a {
    color: #60a5fa;
  }

  ul {
    padding-left: 1.5rem;
    margin: 1rem 0;
  }

  li {
    margin-bottom: 0.5rem;
  }

  p {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }
</style>
