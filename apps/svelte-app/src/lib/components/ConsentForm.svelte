<script lang="ts">
  import ResearchPlanContent from "./ResearchPlanContent.svelte";

  let { onConsent, participantId } = $props<{
    onConsent: (id: string, sig: string, agreements: any) => void;
    participantId: string;
  }>();

  let agreements = $state({
    understand: false,
    voluntary: false,
    withdraw: false,
    recording: false,
  });
  let signature = $state("");

  const isAllAgreed = $derived(
    Object.values(agreements).every(Boolean) && signature.trim() !== ""
  );

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (isAllAgreed) {
      onConsent(participantId, signature, agreements);
    }
  }
</script>

<div class="consent-card">
  <div class="card-header">
    <h3>研究参加への同意</h3>
    <p class="subtitle">研究計画書をよくお読みの上、各項目に同意いただけましたら署名をお願いします。</p>
  </div>

  <div class="card-content">
    <div class="scroll-box">
      <ResearchPlanContent />
    </div>

    <form onsubmit={handleSubmit} id="consent-form">
      <div class="checkbox-group">
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.understand} />
          <span>研究の性質と目的を理解しました。</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.voluntary} />
          <span>自身の自由意思に基づき、研究に任意で参加することに同意します。</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.withdraw} />
          <span>いつでも同意を撤回し、研究への参加を中止できることを理解しました。</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.recording} />
          <span>実験中の音声および映像の記録に同意します。</span>
        </label>
      </div>

      <div class="signature-section">
        <label for="signature">電子署名</label>
        <input
          type="text"
          id="signature"
          bind:value={signature}
          placeholder="氏名を入力してください"
        />
      </div>
    </form>
  </div>

  <div class="card-footer">
    <button
      type="submit"
      form="consent-form"
      disabled={!isAllAgreed}
      class="btn-submit"
    >
      同意して実験を開始する
    </button>
  </div>
</div>

<style>
  .consent-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
  }

  .card-header {
    padding: 2rem;
    border-bottom: 1px solid #eee;
    background: #fcfcfc;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.5rem;
    color: #111;
  }

  .subtitle {
    margin: 0.5rem 0 0;
    color: #666;
    font-size: 0.9rem;
  }

  .card-content {
    padding: 2rem;
  }

  .scroll-box {
    border: 1px solid #eee;
    border-radius: 8px;
    height: 400px;
    overflow-y: auto;
    background: #fafafa;
    margin-bottom: 2rem;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .checkbox-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .checkbox-item input {
    margin-top: 0.25rem;
    width: 1.25rem;
    height: 1.25rem;
  }

  .signature-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .signature-section label {
    font-weight: 600;
    color: #333;
  }

  .signature-section input {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1.1rem;
  }

  .card-footer {
    padding: 1.5rem 2rem;
    background: #f9f9f9;
    border-top: 1px solid #eee;
  }

  .btn-submit {
    width: 100%;
    padding: 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-submit:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .btn-submit:not(:disabled):hover {
    background: #0056b3;
  }
</style>

