<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
</script>

<article class="prose prose-sm max-w-none dark:prose-invert">
  <div class="text-center mb-8">
    <h1 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">{m.plan_title()}</h1>
    
    <p class="text-lg font-medium mb-6 text-gray-800 dark:text-gray-200">
      {m.plan_subtitle_official()}
    </p>

    <p class="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">
      {m.plan_version()}
    </p>
  </div>

  <div class="mb-8">
    <div class="flex justify-between items-start mb-2">
      <span class="font-semibold text-gray-800 dark:text-gray-200">{m.plan_supervisor()}</span>
    </div>
    <div class="border-b border-gray-400 dark:border-gray-500 pb-1 mb-4">
      <span class="text-gray-800 dark:text-gray-200">{m.plan_supervisor_detail()}</span>
    </div>
    <p class="text-sm text-gray-700 dark:text-gray-300">
      {m.plan_ethics_info()}
    </p>
  </div>

  <div class="space-y-8">
    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_purpose_title()}
      </h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {m.plan_purpose_text()}
      </p>
    </section>

    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_procedure_title()}
      </h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {m.plan_procedure_text()}
      </p>
    </section>

    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_risks_title()}
      </h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {m.plan_risks_text()}
      </p>
    </section>

    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_benefits_title()}
      </h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {m.plan_benefits_text()}
      </p>
    </section>

    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_confidentiality_title()}
      </h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {m.plan_confidentiality_text()}
      </p>
    </section>

    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_voluntary_title()}
      </h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {m.plan_voluntary_text()}
      </p>
    </section>

    <section>
      <h2 class="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 text-gray-900 dark:text-gray-100">
        {m.plan_contact_title()}
      </h2>
      <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-gray-700 dark:text-gray-300">
        {m.plan_contact_text()}
      </div>
    </section>
  </div>
</article>

<style>
  /* Base typography is handled by Tailwind's prose class where possible */
  section h2 {
    margin-top: 0 !important;
  }
</style>
