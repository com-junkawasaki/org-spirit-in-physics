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
      <h2>Contact Us</h2>
      <p>If you need assistance, have questions, or want to provide feedback, please reach out to us:</p>
      <div class="contact-card">
        <div class="contact-item">
          <span class="label">Email:</span>
          <a href="mailto:support@spirit-in-physics.com">support@spirit-in-physics.com</a>
        </div>
      </div>
      <p>We aim to respond to all inquiries within 48 hours.</p>
    </section>

    <section class="section">
      <h2>About the App</h2>
      <p>Spirit in Physics is a research application that uses Jungian word association experiments to measure and visualize emotional responses. The app is developed in collaboration with Niigata University Brain Research Institute.</p>
    </section>

    <section class="section">
      <h2>Frequently Asked Questions</h2>

      <div class="faq-item">
        <h3>What is Spirit in Physics?</h3>
        <p>Spirit in Physics is a research platform that uses Jungian word association experiments to measure and visualize human emotional responses as a thermodynamic information quantity.</p>
      </div>

      <div class="faq-item">
        <h3>How long does the experiment take?</h3>
        <p>The experiment consists of two sessions of 100 words each. The total time is approximately 15-20 minutes.</p>
      </div>

      <div class="faq-item">
        <h3>Why do you need camera and microphone access?</h3>
        <p>The camera is used to measure facial expressions using Hume AI technology. The microphone records your verbal responses for speech recognition. Both are essential for the research data collection. You can revoke these permissions at any time through your device settings.</p>
      </div>

      <div class="faq-item">
        <h3>How is my data protected?</h3>
        <p>All data is anonymized and stored securely. The research complies with ICH-GCP standards and has been approved by the Niigata University Ethics Committee (Approval number: 2024-0269). For more details, please see our <a href="/privacy/">Privacy Policy</a>.</p>
      </div>

      <div class="faq-item">
        <h3>Can I withdraw from the study?</h3>
        <p>Yes, participation is completely voluntary. You may withdraw at any time without providing a reason, and this will not result in any disadvantages. To request data deletion, contact us at <a href="mailto:support@spirit-in-physics.com">support@spirit-in-physics.com</a>.</p>
      </div>

      <div class="faq-item">
        <h3>How do I delete my account?</h3>
        <p>To delete your account and all associated data, please contact us at <a href="mailto:support@spirit-in-physics.com">support@spirit-in-physics.com</a>. We will process your request within 30 days.</p>
      </div>
    </section>

    <section class="section">
      <h2>Troubleshooting</h2>
      <p>If you experience technical issues with the app:</p>
      <ul>
        <li>Ensure you have a stable internet connection</li>
        <li>Grant camera and microphone permissions when prompted</li>
        <li>Make sure your device is running the latest version of iOS</li>
        <li>Try closing and reopening the app if it becomes unresponsive</li>
        <li>Check that your device has sufficient storage space</li>
      </ul>
      <p>If the issue persists, please contact us at <a href="mailto:support@spirit-in-physics.com">support@spirit-in-physics.com</a> with a description of the problem and your device model.</p>
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
