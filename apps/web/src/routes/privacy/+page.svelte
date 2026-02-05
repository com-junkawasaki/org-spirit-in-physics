<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
</script>

<svelte:head>
  <title>Privacy Policy | Spirit in Physics</title>
</svelte:head>

<div class="privacy-page">
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last Updated: February 2025</p>

    <section class="section">
      <h2>1. Introduction</h2>
      <p>Spirit in Physics ("we", "our", "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our research application.</p>
    </section>

    <section class="section">
      <h2>2. Data Controller</h2>
      <p>The data controller responsible for your personal data is:</p>
      <div class="info-card">
        <p><strong>Jun Kawasaki</strong></p>
        <p>In collaboration with Niigata University Brain Research Institute</p>
        <p>Email: jun784@gmail.com</p>
        <p>Phone: +81-80-4280-1991</p>
      </div>
    </section>

    <section class="section">
      <h2>3. Data We Collect</h2>
      <p>When you participate in our research, we collect:</p>
      <ul>
        <li><strong>Account Information:</strong> Email address for authentication</li>
        <li><strong>Demographic Data (Optional):</strong> Age group, gender, ethnicity, income range, medical history</li>
        <li><strong>Experimental Data:</strong>
          <ul>
            <li>Word association responses (audio recordings)</li>
            <li>Reaction times</li>
            <li>Facial expression data (video recordings processed by Hume AI)</li>
            <li>Physiological signals (if using SKINPRO device)</li>
          </ul>
        </li>
      </ul>
    </section>

    <section class="section">
      <h2>4. How We Use Your Data</h2>
      <p>Your data is used exclusively for:</p>
      <ul>
        <li>Scientific research on consciousness and psychological processes</li>
        <li>Statistical analysis and pattern identification</li>
        <li>Academic publications and conference presentations</li>
        <li>Improving the research methodology</li>
      </ul>
      <p>We do not use your data for marketing, advertising, or any commercial purposes.</p>
    </section>

    <section class="section">
      <h2>5. Data Protection</h2>
      <p>We implement robust security measures:</p>
      <ul>
        <li><strong>Anonymization:</strong> All research data is anonymized and cannot be traced back to individual participants</li>
        <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
        <li><strong>Access Control:</strong> Only authorized researchers can access the data</li>
        <li><strong>Secure Storage:</strong> Data is stored on secure servers with regular security audits</li>
      </ul>
    </section>

    <section class="section">
      <h2>6. Data Sharing</h2>
      <p>We may share anonymized data with:</p>
      <ul>
        <li>Niigata University research team</li>
        <li>Academic journals for publication</li>
        <li>Scientific conferences for presentations</li>
      </ul>
      <p>We never sell or share identifiable personal data with third parties for commercial purposes.</p>
    </section>

    <section class="section">
      <h2>7. Data Retention</h2>
      <p>Research data is retained for the duration of the study and for a period required by academic standards (typically 5-10 years after publication). You may request deletion of your data at any time by contacting us.</p>
    </section>

    <section class="section">
      <h2>8. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data</li>
        <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
        <li><strong>Erasure:</strong> Request deletion of your data</li>
        <li><strong>Withdraw Consent:</strong> Withdraw your participation at any time</li>
        <li><strong>Data Portability:</strong> Receive your data in a structured format</li>
      </ul>
    </section>

    <section class="section">
      <h2>9. Third-Party Services</h2>
      <p>Our application uses the following third-party services:</p>
      <ul>
        <li><strong>Clerk:</strong> Authentication service</li>
        <li><strong>Hume AI:</strong> Facial expression analysis</li>
        <li><strong>Google Cloud:</strong> Infrastructure and data storage</li>
      </ul>
      <p>Each service has its own privacy policy governing data handling.</p>
    </section>

    <section class="section">
      <h2>10. Ethics Approval</h2>
      <p>This research has been reviewed and approved by the Niigata University Ethics Committee.</p>
      <div class="info-card">
        <p><strong>Approval Number:</strong> 2024-0269</p>
        <p><strong>Approval Date:</strong> March 1, 2025</p>
      </div>
      <p>The research complies with ICH-GCP (International Conference on Harmonisation - Good Clinical Practice) standards.</p>
    </section>

    <section class="section">
      <h2>11. Contact Us</h2>
      <p>For any questions or concerns about this privacy policy or your personal data, please contact:</p>
      <div class="info-card">
        <p><strong>Email:</strong> <a href="mailto:jun784@gmail.com">jun784@gmail.com</a></p>
        <p><strong>Phone:</strong> +81-80-4280-1991</p>
        <p><strong>Research Institution:</strong></p>
        <p>Niigata University Brain Research Institute</p>
        <p>Systems Brain Pathology Laboratory (Tainaka Lab)</p>
        <p>Email: <a href="mailto:kztainaka@bri.niigata-u.ac.jp">kztainaka@bri.niigata-u.ac.jp</a></p>
      </div>
    </section>

    <section class="section">
      <h2>12. Changes to This Policy</h2>
      <p>We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.</p>
    </section>
  </div>
</div>

<style>
  .privacy-page {
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
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .last-updated {
    color: #666;
    margin-bottom: 2rem;
    font-style: italic;
  }

  :global(.dark) .last-updated {
    color: #999;
  }

  h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    margin-top: 0;
  }

  .section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--card, #f5f5f5);
    border-radius: 8px;
  }

  :global(.dark) .section {
    background: #1a1a1a;
  }

  .info-card {
    background: var(--background, #fff);
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
    border-left: 4px solid #2563eb;
  }

  :global(.dark) .info-card {
    background: #0a0a0a;
    border-left-color: #60a5fa;
  }

  ul {
    padding-left: 1.5rem;
    margin: 1rem 0;
  }

  ul ul {
    margin: 0.5rem 0;
  }

  li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
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

  p {
    margin-bottom: 0.75rem;
    line-height: 1.6;
  }

  strong {
    font-weight: 600;
  }
</style>
