<script lang="ts">
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";
</script>

<svelte:head>
  <title>{m.thank_you()} | Spirit in Physics</title>
</svelte:head>

<div class="step-container success">
  <h2>{m.thank_you()}</h2>
  <p>{m.experiment_finished()}</p>
  <button class="btn" onclick={() => {
    kawasakiStore.resetTest();
    window.location.href = "/participant";
  }}>{m.back_to_top()}</button>
</div>

<style>
  .step-container {
    width: 100%;
    max-width: 900px;
    padding: 2rem;
  }

  .success {
    background: white;
    padding: 4rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }

  .success h2 {
    color: #10b981;
    margin-bottom: 1rem;
    font-size: 2rem;
    font-weight: 700;
  }

  .success p {
    margin-bottom: 2rem;
    color: #4b5563;
  }

  .btn {
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    background: #000;
    color: #fff;
    border: none;
    transition: all 0.2s;
  }

  .btn:hover {
    background: #333;
    transform: translateY(-2px);
  }
</style>

