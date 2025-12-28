<script lang="ts">
  import ResearchPlanContent from "./ResearchPlanContent.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { MENTAL_ILLNESS_CODES, type IllnessCode } from "$lib/researcher/illness-codes";
  import { languageTag } from "$lib/paraglide/runtime.js";

  let { onConsent, participantId } = $props<{
    onConsent: (id: string, signature: string, agreements: any, demographics: any) => void;
    participantId: string;
  }>();

  let agreements = $state({
    understand: false,
    voluntary: false,
    withdraw: false,
    recording: false,
  });

  let signature = $state("");
  let showFullConsent = $state(false);

  let demographics = $state({
    ageGroup: "",
    gender: "",
    ethnicity: "",
    incomeRange: "",
    mentalIllness: "",
  });

  let illnessSearch = $state("");
  let showIllnessSuggestions = $state(false);

  const filteredIllnessCodes = $derived(
    illnessSearch.trim() === "" 
      ? [] 
      : MENTAL_ILLNESS_CODES.filter(code => 
          code.name_en.toLowerCase().includes(illnessSearch.toLowerCase()) || 
          code.name_ja.includes(illnessSearch) ||
          code.code.toLowerCase().includes(illnessSearch.toLowerCase())
        )
  );

  const isAllAgreed = $derived(
    Object.values(agreements).every(Boolean) && signature.trim() !== ""
  );

  function selectIllness(code: IllnessCode) {
    demographics.mentalIllness = code.code;
    illnessSearch = languageTag() === "ja" ? code.name_ja : code.name_en;
    showIllnessSuggestions = false;
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (isAllAgreed) {
      onConsent(participantId, signature, agreements, demographics);
    }
  }
</script>

<div class="consent-card">
  <div class="card-header">
    <h3>{m.consent_title()}</h3>
    <p class="subtitle">{m.consent_subtitle()}</p>
  </div>

  <div class="card-content">
    <div class="consent-toggle">
      <button 
        type="button"
        onclick={() => showFullConsent = !showFullConsent}
        class="btn-text"
      >
        {showFullConsent ? m.collapse_consent() : m.read_full_consent()}
      </button>
    </div>

    {#if showFullConsent}
      <div class="scroll-box">
        <ResearchPlanContent />
      </div>
    {/if}

    <form onsubmit={handleSubmit} id="consent-form">
      <div class="section-title">{m.demographic_title()}</div>
      <p class="section-subtitle">{m.demographic_subtitle()}</p>

      <div class="demographic-grid">
        <div class="form-group">
          <label for="ageGroup">{m.age_group()}</label>
          <select id="ageGroup" bind:value={demographics.ageGroup}>
            <option value="">{m.select_age()}</option>
            <option value="18-24">18-24</option>
            <option value="25-34">25-34</option>
            <option value="35-44">35-44</option>
            <option value="45-54">45-54</option>
            <option value="55-64">55-64</option>
            <option value="65+">65+</option>
            <option value="prefer-not-to-say">{m.prefer_not_to_say()}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="gender">{m.gender()}</label>
          <select id="gender" bind:value={demographics.gender}>
            <option value="">{m.prefer_not_to_say()}</option>
            <option value="male">{m.male()}</option>
            <option value="female">{m.female()}</option>
            <option value="non-binary">{m.non_binary()}</option>
            <option value="prefer-not-to-say">{m.prefer_not_to_say()}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="ethnicity">{m.ethnicity()}</label>
          <select id="ethnicity" bind:value={demographics.ethnicity}>
            <option value="">{m.select_ethnicity()}</option>
            <option value="asian">{m.asian()}</option>
            <option value="black">{m.black()}</option>
            <option value="hispanic">{m.hispanic()}</option>
            <option value="native">{m.native()}</option>
            <option value="pacific">{m.pacific()}</option>
            <option value="white">{m.white()}</option>
            <option value="multiple">{m.multiple()}</option>
            <option value="other">{m.other()}</option>
            <option value="prefer-not-to-say">{m.prefer_not_to_say()}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="income">{m.income()}</label>
          <select id="income" bind:value={demographics.incomeRange}>
            <option value="">{m.select_income()}</option>
            <option value="under-25k">{m.under_25k()}</option>
            <option value="25k-50k">{m.25k_50k()}</option>
            <option value="50k-75k">{m.50k_75k()}</option>
            <option value="75k-100k">{m.75k_100k()}</option>
            <option value="100k-150k">{m.100k_150k()}</option>
            <option value="over-150k">{m.over_150k()}</option>
            <option value="prefer-not-to-say">{m.prefer_not_to_say()}</option>
          </select>
        </div>
      </div>

      <div class="form-group full-width suggest-container">
        <label for="mentalIllness">{m.mental_illness()}</label>
        <input 
          type="text" 
          id="mentalIllness" 
          bind:value={illnessSearch}
          placeholder={m.mental_illness_placeholder()}
          onfocus={() => showIllnessSuggestions = true}
          autocomplete="off"
        />
        {#if showIllnessSuggestions && filteredIllnessCodes.length > 0}
          <ul class="suggestions">
            {#each filteredIllnessCodes as code}
              <li>
                <button type="button" onclick={() => selectIllness(code)}>
                  <span class="code">{code.code}</span>
                  <span class="name">{languageTag() === "ja" ? code.name_ja : code.name_en}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="checkbox-group">
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.understand} />
          <span>{m.consent_understand()}</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.voluntary} />
          <span>{m.consent_voluntary()}</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.withdraw} />
          <span>{m.consent_withdraw()}</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" bind:checked={agreements.recording} />
          <span>{m.consent_recording()}</span>
        </label>
      </div>

      <div class="signature-section">
        <label for="signature">{m.electronic_signature()}</label>
        <input
          type="text"
          id="signature"
          bind:value={signature}
          placeholder={m.enter_name()}
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
      {m.agree_and_start()}
    </button>
    <div class="standards-info">
      <p>{m.gcp_standards()}</p>
      <p>{m.irb_info()}</p>
    </div>
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
    color: #333;
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

  .consent-toggle {
    margin-bottom: 1rem;
    display: flex;
    justify-content: flex-end;
  }

  .btn-text {
    background: none;
    border: none;
    color: #007bff;
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .scroll-box {
    border: 1px solid #eee;
    border-radius: 8px;
    height: 300px;
    overflow-y: auto;
    background: #fafafa;
    margin-bottom: 2rem;
    padding: 1rem;
    font-size: 0.9rem;
  }

  .section-title {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
    color: #111;
  }

  .section-subtitle {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 1.5rem;
  }

  .demographic-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #444;
  }

  .form-group select, .form-group input {
    padding: 0.6rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: white;
    font-size: 0.95rem;
  }

  .suggest-container {
    position: relative;
    margin-bottom: 2rem;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-top: none;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .suggestions li button {
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    gap: 1rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .suggestions li button:hover {
    background: #f8f9fa;
  }

  .suggestions li button .code {
    font-weight: 700;
    color: #007bff;
    min-width: 3rem;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 8px;
    border: 1px solid #eee;
  }

  .checkbox-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .checkbox-item input {
    margin-top: 0.2rem;
    width: 1.1rem;
    height: 1.1rem;
  }

  .signature-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
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
    padding: 2rem;
    background: #f9f9f9;
    border-top: 1px solid #eee;
  }

  .btn-submit {
    width: 100%;
    padding: 1rem;
    background: #000;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
    margin-bottom: 1.5rem;
  }

  .btn-submit:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .btn-submit:not(:disabled):hover {
    background: #333;
  }

  .standards-info {
    font-size: 0.75rem;
    color: #888;
    line-height: 1.4;
  }

  .standards-info p {
    margin: 0;
  }

  @media (max-width: 600px) {
    .demographic-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
