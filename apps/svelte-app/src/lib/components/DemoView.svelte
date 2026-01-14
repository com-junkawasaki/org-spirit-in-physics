<script lang="ts">
  import { onMount } from "svelte";

  let status = $state("ready");

  const startDemo = () => {
    status = "running";
    setTimeout(() => {
      status = "completed";
    }, 3000);
  };
</script>

<div class="view">
  <h2>Spirit Measurement Demo</h2>
  <p>Experience the measurement process in this interactive demo.</p>

  <div class="demo-box">
    {#if status === "ready"}
      <div class="setup">
        <p>Ready to start the word association simulation?</p>
        <button class="btn primary" onclick={startDemo}>Start Demo</button>
      </div>
    {:else if status === "running"}
      <div class="simulation">
        <div class="word-display">
          <span class="word">SPIRIT</span>
        </div>
        <p>Measuring physiological response...</p>
        <div class="progress-bar">
          <div class="fill"></div>
        </div>
      </div>
    {:else}
      <div class="results">
        <h3>Demo Complete</h3>
        <p>Measured Information Quantity: <strong>4.2 bits</strong></p>
        <button class="btn" onclick={() => status = "ready"}>Reset</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .view {
    padding: 1rem;
    text-align: center;
  }
  .demo-box {
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    max-width: 500px;
    margin: 2rem auto;
  }
  .word-display {
    font-size: 3rem;
    font-weight: bold;
    margin: 2rem 0;
    letter-spacing: 0.5rem;
    color: #007bff;
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 1rem;
  }
  .fill {
    height: 100%;
    background: #007bff;
    width: 60%;
    animation: pulse 2s infinite ease-in-out;
  }
  @keyframes pulse {
    0% { width: 0%; }
    100% { width: 100%; }
  }
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    font-weight: 600;
  }
  .btn.primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
</style>







