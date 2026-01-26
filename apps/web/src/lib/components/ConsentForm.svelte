<script lang="ts">
  import ResearchPlanContent from "./ResearchPlanContent.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { ILLNESS_CODES, type IllnessCode } from "$lib/researcher/illness-codes";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { SignedIn, SignedOut, useClerkContext } from 'svelte-clerk';
  import { runtimeConfig } from "$lib/env.svelte";
  import { fade, fly } from "svelte/transition";

  let { onConsent, participantId } = $props<{
    onConsent: (id: string, email: string, agreements: any, demographics: any) => void;
    participantId: string;
  }>();

  let step = $state(1);
  const totalSteps = 4;

  let agreements = $state({
    understand: false,
    voluntary: false,
    withdraw: false,
    recording: false,
  });

  let email = $state("");
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

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);

  const isAllAgreed = $derived(
    Object.values(agreements).every(Boolean)
  );

  const isDemographicsComplete = $derived(
    demographics.ageGroup && demographics.gender && demographics.ethnicity && demographics.incomeRange
  );

  const isEmailProvided = $derived(
    user || email.trim() !== ""
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

  function nextStep() {
    if (step < totalSteps) step += 1;
  }

  function prevStep() {
    if (step > 1) step -= 1;
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (isAllAgreed && isDemographicsComplete && isEmailProvided) {
      if (user) {
        onConsent(participantId, user.primaryEmailAddress?.emailAddress || "", agreements, demographics);
      } else {
        onConsent(participantId, email, agreements, demographics);
      }
    }
  }
</script>

<div class="narrative-form min-h-[500px] flex flex-col">
  <!-- Progress Bar -->
  <div class="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
    <div 
      class="h-full bg-blue-500 transition-all duration-500 ease-out"
      style="width: {(step / totalSteps) * 100}%"
    ></div>
  </div>

  <form onsubmit={handleSubmit} class="flex-1 flex flex-col">
    <div class="flex-1 relative">
      {#if step === 1}
        <div in:fly={{ x: 20, duration: 400 }} out:fade={{ duration: 200 }}>
          <h2 class="text-2xl font-black mb-4 uppercase tracking-tighter">{m.consent_title()}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {m.consent_subtitle()}
          </p>
          
          <div class="space-y-4 mb-8">
            <button 
              type="button"
              onclick={() => showFullConsent = !showFullConsent}
              class="w-full p-4 border border-gray-200 dark:border-gray-800 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex justify-between items-center"
            >
              <span class="font-bold text-sm uppercase tracking-widest">{m.read_full_consent()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {showFullConsent ? 'rotate-180' : ''} transition-transform" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            
            {#if showFullConsent}
              <div 
                transition:fade
                class="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl max-h-64 overflow-y-auto text-sm border border-gray-100 dark:border-gray-800"
              >
                <ResearchPlanContent />
              </div>
            {/if}
          </div>

          <div class="space-y-4">
            {#each Object.entries(agreements) as [key, value]}
              <label class="flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer
                {agreements[key as keyof typeof agreements] 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm' 
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}">
                <input 
                  type="checkbox" 
                  bind:checked={agreements[key as keyof typeof agreements]}
                  class="mt-1 w-5 h-5 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-medium leading-tight">
                  {#if key === 'understand'}{m.consent_understand()}
                  {:else if key === 'voluntary'}{m.consent_voluntary()}
                  {:else if key === 'withdraw'}{m.consent_withdraw()}
                  {:else if key === 'recording'}{m.consent_recording()}
                  {/if}
                </span>
              </label>
            {/each}
          </div>
        </div>
      {:else if step === 2}
        <div in:fly={{ x: 20, duration: 400 }} out:fade={{ duration: 200 }}>
          <h2 class="text-2xl font-black mb-4 uppercase tracking-tighter">{m.demographic_title()}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8">
            {m.demographic_subtitle()}
          </p>

          <div class="space-y-6">
            <div>
              <span class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{m.age_group()}</span>
              <div class="grid grid-cols-3 gap-2">
                {#each ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as age}
                  <button 
                    type="button"
                    class="p-3 text-xs font-bold border rounded-xl transition-all
                      {demographics.ageGroup === age 
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}"
                    onclick={() => demographics.ageGroup = age}
                  >
                    {age}
                  </button>
                {/each}
              </div>
            </div>

            <div>
              <span class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{m.gender()}</span>
              <div class="grid grid-cols-2 gap-2">
                {#each [
                  { value: "male", label: m.male() },
                  { value: "female", label: m.female() }, 
                  { value: "non-binary", label: m.non_binary() },
                  { value: "prefer-not-to-say", label: m.prefer_not_to_say() }
                ] as option}
                  <button 
                    type="button"
                    class="p-3 text-xs font-bold border rounded-xl transition-all
                      {demographics.gender === option.value 
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}"
                    onclick={() => demographics.gender = option.value}
                  >
                    {option.label}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {:else if step === 3}
        <div in:fly={{ x: 20, duration: 400 }} out:fade={{ duration: 200 }}>
          <h2 class="text-2xl font-black mb-4 uppercase tracking-tighter">{m.demographic_title()} (Cont.)</h2>
          
          <div class="space-y-6">
            <div>
              <label for="ethnicity" class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{m.ethnicity()}</label>
              <select 
                id="ethnicity"
                bind:value={demographics.ethnicity}
                class="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
              <label for="income" class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{m.income()}</label>
              <select 
                id="income"
                bind:value={demographics.incomeRange}
                class="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
              <label for="medical-history" class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{m.medical_history()}</label>
              
              <div class="flex flex-wrap gap-2 mb-3">
                {#each demographics.medicalHistory as code}
                  <button 
                    type="button"
                    onclick={() => removeIllness(code)}
                    class="px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                  >
                    {code} | {getIllnessName(code)}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                {/each}
              </div>

              <input 
                id="medical-history"
                type="text" 
                bind:value={illnessSearch}
                placeholder={m.medical_history_placeholder()}
                onfocus={() => showIllnessSuggestions = true}
                class="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                autocomplete="off"
              />
              {#if showIllnessSuggestions && filteredIllnessCodes.length > 0}
                <ul class="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {#each filteredIllnessCodes as code}
                    <li>
                      <button 
                        type="button" 
                        onclick={() => selectIllness(code)}
                        class="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex gap-4 border-b border-gray-50 dark:border-gray-800 last:border-none"
                      >
                        <span class="font-black text-blue-500 text-xs">{code.code}</span>
                        <span class="text-xs font-bold">{languageTag() === "ja" ? code.name_ja : code.name_en}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        </div>
      {:else if step === 4}
        <div in:fly={{ x: 20, duration: 400 }} out:fade={{ duration: 200 }}>
          <h2 class="text-2xl font-black mb-4 uppercase tracking-tighter">{m.electronic_signature()}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            最後に、あなたの電子署名としてメールアドレスを確認します。これによって解析結果が保存され、あなただけがアクセスできるようになります。
          </p>

          <div class="p-8 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            {#if runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}
              <SignedIn>
                <div class="flex items-center gap-6">
                  <div class="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20">
                    {user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'U'}
                  </div>
                  <div class="flex-1">
                    <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{m.already_signed_in_as()}</p>
                    <p class="text-lg font-black">{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </div>
              </SignedIn>

              <SignedOut>
                {@render emailInput()}
              </SignedOut>
            {:else}
              {@render emailInput()}
            {/if}
          </div>
          
          <div class="mt-8 text-center">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
              {m.gcp_standards()}<br/>
              {m.irb_info()}
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Navigation -->
    <div class="mt-12 flex justify-between items-center">
      {#if step > 1}
        <button 
          type="button" 
          onclick={prevStep}
          class="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          {m.back || "Back"}
        </button>
      {:else}
        <div></div>
      {/if}

      {#if step < totalSteps}
        <button 
          type="button" 
          onclick={nextStep}
          disabled={(step === 1 && !isAllAgreed) || (step === 2 && (!demographics.ageGroup || !demographics.gender)) || (step === 3 && (!demographics.ethnicity || !demographics.incomeRange))}
          class="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-all disabled:opacity-20 disabled:scale-100 shadow-xl shadow-black/10 dark:shadow-white/10"
        >
          {m.next || "Continue"}
        </button>
      {:else}
        <button 
          type="submit"
          disabled={!isEmailProvided}
          class="px-10 py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-all shadow-2xl shadow-blue-600/20 disabled:opacity-20 disabled:scale-100"
        >
          {m.agree_and_start()}
        </button>
      {/if}
    </div>
  </form>
</div>

{#snippet emailInput()}
  <div class="space-y-4">
    <label for="email" class="block text-[10px] font-black uppercase tracking-widest text-gray-400">{m.enter_email || "Email Address"}</label>
    <input
      type="email"
      id="email"
      bind:value={email}
      placeholder="your@email.com"
      class="w-full px-6 py-5 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
    />
  </div>
{/snippet}

<style>
  .narrative-form {
    max-width: 600px;
    margin: 0 auto;
  }
  
  :global(.dark) select {
    color-scheme: dark;
  }
</style>
