<script lang="ts">
  import ResearchPlanContent from "./ResearchPlanContent.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { ILLNESS_CODES, type IllnessCode } from "$lib/researcher/illness-codes";
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
    medicalHistory: [] as string[],
  });

  let illnessSearch = $state("");
  let showIllnessSuggestions = $state(false);

  const filteredIllnessCodes = $derived(
    illnessSearch.trim() === "" 
      ? [] 
      : ILLNESS_CODES.filter(code => 
          (code.name_en.toLowerCase().includes(illnessSearch.toLowerCase()) || 
          code.name_ja.includes(illnessSearch) ||
          code.code.toLowerCase().includes(illnessSearch.toLowerCase())) &&
          !demographics.medicalHistory.includes(code.code)
        )
  );

  const isAllAgreed = $derived(
    Object.values(agreements).every(Boolean) && signature.trim() !== ""
  );

  function selectIllness(code: IllnessCode) {
    if (!demographics.medicalHistory.includes(code.code)) {
      demographics.medicalHistory = [...demographics.medicalHistory, code.code];
    }
    illnessSearch = "";
    showIllnessSuggestions = false;
  }

  function removeIllness(code: string) {
    demographics.medicalHistory = demographics.medicalHistory.filter(c => c !== code);
  }

  function getIllnessName(code: string) {
    const illness = ILLNESS_CODES.find(c => c.code === code);
    if (!illness) return code;
    return languageTag() === "ja" ? illness.name_ja : illness.name_en;
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (isAllAgreed) {
      onConsent(participantId, signature, agreements, demographics);
    }
  }
</script>

<form 
  class="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700" 
  onsubmit={handleSubmit} 
  id="consent-form"
>
  <h2 class="text-xl sm:text-2xl font-bold mb-3 text-black dark:text-white">{m.consent_title()}</h2>
  
  <div class="mb-4 sm:mb-6">
    <p class="mb-3 text-sm sm:text-base text-gray-800 dark:text-gray-200">{m.consent_subtitle()}</p>
    
    <button 
      type="button"
      onclick={() => showFullConsent = !showFullConsent}
      class="text-blue-600 dark:text-blue-400 hover:underline mb-3 text-sm sm:text-base font-medium"
    >
      {showFullConsent ? m.collapse_consent() : m.read_full_consent()}
    </button>
    
    {#if showFullConsent}
      <div class="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-md mb-4 max-h-72 sm:max-h-96 overflow-y-auto text-xs sm:text-sm border border-gray-200 dark:border-gray-600">
        <ResearchPlanContent />
      </div>
    {/if}
  </div>
  
  <div class="mb-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
    <h3 class="font-bold mb-1 text-gray-900 dark:text-gray-100 text-base sm:text-lg">{m.demographic_title()}</h3>
    <p class="text-xs sm:text-sm mb-5 text-gray-600 dark:text-gray-400">{m.demographic_subtitle()}</p>
    
    <div class="space-y-5">
      <div>
        <label for="ageGroup" class="block mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{m.age_group()}</label>
        <select 
          id="ageGroup" 
          bind:value={demographics.ageGroup}
          class="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
        >
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
      
      <div>
        <span class="block mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{m.gender()}</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each [
            { value: "male", label: m.male() },
            { value: "female", label: m.female() }, 
            { value: "non-binary", label: m.non_binary() },
            { value: "prefer-not-to-say", label: m.prefer_not_to_say() }
          ] as option}
            <button 
              type="button"
              class="flex items-center gap-3 border rounded-md p-3 cursor-pointer transition-all text-left
                {demographics.gender === option.value 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-sm ring-1 ring-blue-500' 
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-gray-200 dark:border-gray-600'}"
              onclick={() => demographics.gender = option.value}
            >
              <div class="w-4 h-4 rounded-full border flex items-center justify-center
                {demographics.gender === option.value ? 'border-blue-500' : 'border-gray-400'}">
                {#if demographics.gender === option.value}
                  <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                {/if}
              </div>
              <span class="text-xs sm:text-sm text-gray-800 dark:text-gray-200 flex-1">{option.label}</span>
            </button>
          {/each}
        </div>
      </div>
      
      <div>
        <label for="ethnicity" class="block mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{m.ethnicity()}</label>
        <select 
          id="ethnicity" 
          bind:value={demographics.ethnicity}
          class="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
        >
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
      
      <div>
        <label for="income" class="block mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{m.income()}</label>
        <select 
          id="income" 
          bind:value={demographics.incomeRange}
          class="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
        >
          <option value="">{m.select_income()}</option>
          <option value="under-25k">{m.under_25k()}</option>
          <option value="25k-50k">{m.income_25k_50k()}</option>
          <option value="50k-75k">{m.income_50k_75k()}</option>
          <option value="75k-100k">{m.income_75k_100k()}</option>
          <option value="100k-150k">{m.income_100k_150k()}</option>
          <option value="over-150k">{m.over_150k()}</option>
          <option value="prefer-not-to-say">{m.prefer_not_to_say()}</option>
        </select>
      </div>

      <div class="relative">
        <label for="medicalHistory" class="block mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{m.medical_history()}</label>
        
        {#if demographics.medicalHistory.length > 0}
          <div class="flex flex-wrap gap-2 mb-3">
            {#each demographics.medicalHistory as code}
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/50">
                <span class="font-bold border-r border-blue-200 dark:border-blue-700 pr-1.5">{code}</span>
                <span class="max-w-[150px] truncate">{getIllnessName(code)}</span>
                <button 
                  type="button" 
                  onclick={() => removeIllness(code)}
                  class="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors group"
                  aria-label="Remove"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <input 
          type="text" 
          id="medicalHistory" 
          bind:value={illnessSearch}
          placeholder={m.medical_history_placeholder()}
          onfocus={() => showIllnessSuggestions = true}
          class="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
          autocomplete="off"
        />
        {#if showIllnessSuggestions && filteredIllnessCodes.length > 0}
          <ul class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {#each filteredIllnessCodes as code}
              <li>
                <button 
                  type="button" 
                  onclick={() => selectIllness(code)}
                  class="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex gap-3 border-b border-gray-100 dark:border-gray-700 last:border-none"
                >
                  <span class="font-bold text-blue-600 dark:text-blue-400 min-width-[3rem]">{code.code}</span>
                  <span class="text-sm dark:text-gray-200">{languageTag() === "ja" ? code.name_ja : code.name_en}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </div>
  
  <div class="space-y-4 mb-6 px-1">
    <div class="flex items-start gap-3">
      <div class="relative flex items-center mt-1">
        <input 
          type="checkbox" 
          id="consent-check" 
          bind:checked={agreements.understand}
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>
      <label for="consent-check" class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer">{m.consent_understand()}</label>
    </div>
    <div class="flex items-start gap-3">
      <div class="relative flex items-center mt-1">
        <input 
          type="checkbox" 
          id="voluntary-check" 
          bind:checked={agreements.voluntary}
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>
      <label for="voluntary-check" class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer">{m.consent_voluntary()}</label>
    </div>
    <div class="flex items-start gap-3">
      <div class="relative flex items-center mt-1">
        <input 
          type="checkbox" 
          id="withdraw-check" 
          bind:checked={agreements.withdraw}
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>
      <label for="withdraw-check" class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer">{m.consent_withdraw()}</label>
    </div>
    <div class="flex items-start gap-3">
      <div class="relative flex items-center mt-1">
        <input 
          type="checkbox" 
          id="recording-check" 
          bind:checked={agreements.recording}
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>
      <label for="recording-check" class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer">{m.consent_recording()}</label>
    </div>
  </div>

  <div class="mb-8">
    <label for="signature" class="block mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{m.electronic_signature()}</label>
    <input
      type="text"
      id="signature"
      bind:value={signature}
      placeholder={m.enter_name()}
      class="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
    />
  </div>
  
  <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
    <div class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 space-y-1">
      <p>{m.gcp_standards()}</p>
      <p>{m.irb_info()}</p>
    </div>
    
    <button 
      type="submit"
      disabled={!isAllAgreed}
      class="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-md transition-colors shadow-sm text-sm"
    >
      {m.agree_and_start()}
    </button>
  </div>
</form>

<style>
  /* Use Tailwind classes for most styles */
  :global(.dark) select {
    color-scheme: dark;
  }
</style>
