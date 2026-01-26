<script lang="ts">
  import { SignedIn, SignedOut, SignUp, useClerkContext } from "svelte-clerk";
  import * as m from "$lib/paraglide/messages.js";
  import { resolveRoute } from "$lib/routing";
  import { runtimeConfig } from "$lib/env.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  const clerk = useClerkContext();

  // On mobile, if already signed in, skip this page entirely and go to consent
  $effect(() => {
    if (runtimeConfig.IS_CAPACITOR && clerk.user) {
      console.log("[Mobile] User is signed in, redirecting to consent");
      goto(resolveRoute('/experiment/consent'));
    }
  });
</script>

<div class="flex flex-col items-center text-center p-6 md:py-24">
  <div class="mb-12">
    <h1 class="text-3xl md:text-6xl font-black tracking-tight mb-4">
      {m.experiment_landing_title()}
    </h1>
    <p class="text-lg md:text-2xl font-medium text-blue-600 mb-6">
      {m.experiment_landing_hero()}
    </p>
    {#if !runtimeConfig.IS_CAPACITOR}
      <p class="max-w-2xl text-gray-500 dark:text-gray-400 leading-relaxed mx-auto">
        {m.experiment_landing_description()}
      </p>
    {/if}
  </div>

  <div class="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800" class:mt-8={runtimeConfig.IS_CAPACITOR}>
    {#if !clerk}
      <div class="flex flex-col items-center py-12 gap-4">
        <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Initializing Space...</p>
      </div>
    {:else}
      <SignedOut>
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">{m.experiment_auth_title()}</h2>
          <p class="text-xs text-gray-500 mb-6">{m.experiment_auth_subtitle()}</p>
          <p class="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-4">
            <i class="fas fa-exclamation-triangle mr-1"></i> {m.email_otp_required()}
          </p>
        </div>
        
        <div class="clerk-container">
          <SignUp 
            routing="hash"
            signInUrl={resolveRoute('/experiment')}
            forceRedirectUrl={resolveRoute('/experiment/consent')}
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-none p-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "hidden",
                dividerRow: "hidden",
                footerAction: "hidden",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm font-bold py-3 rounded-xl transition-all",
                formFieldInput: "bg-white dark:bg-black border-gray-200 dark:border-gray-700 rounded-xl",
                formFieldLabel: "text-[10px] font-bold uppercase text-gray-400 mb-1"
              }
            }}
          />
        </div>
      </SignedOut>

      <SignedIn>
        <div class="text-center">
          <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="text-xl font-bold mb-2">Ready to Start</h2>
          <p class="text-sm text-gray-500 mb-8">You are signed in as {clerk.user?.primaryEmailAddress?.emailAddress}</p>
          
          <a 
            href={resolveRoute('/experiment/consent')}
            class="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
          >
            {m.start_experiment()}
          </a>
        </div>
      </SignedIn>
    {/if}
  </div>

  {#if !runtimeConfig.IS_CAPACITOR}
    <div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl">
      <div class="p-6 bg-white dark:bg-black border border-gray-100 dark:border-gray-900 rounded-2xl">
        <div class="text-blue-600 font-black mb-2">01. Measure</div>
        <h3 class="font-bold mb-2">Multi-modal Analysis</h3>
        <p class="text-xs text-gray-500 leading-relaxed">We use voice, facial expressions, and reaction times to build your unique spirit manifold.</p>
      </div>
      <div class="p-6 bg-white dark:bg-black border border-gray-100 dark:border-gray-900 rounded-2xl">
        <div class="text-blue-600 font-black mb-2">02. Analyze</div>
        <h3 class="font-bold mb-2">Ghost Pattern Detection</h3>
        <p class="text-xs text-gray-500 leading-relaxed">Our algorithms identify structural anomalies and information energy charge in your psychological space.</p>
      </div>
      <div class="p-6 bg-white dark:bg-black border border-gray-100 dark:border-gray-900 rounded-2xl">
        <div class="text-blue-600 font-black mb-2">03. Report</div>
        <h3 class="font-bold mb-2">Scientific Feedback</h3>
        <p class="text-xs text-gray-500 leading-relaxed">Receive a personal report of your results, formatted for our contribution to the global research community.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.clerk-container .cl-signUp-root) {
    width: 100% !important;
  }
</style>

