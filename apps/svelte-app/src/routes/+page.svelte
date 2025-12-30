<script lang="ts">
  import PaperView from "$lib/components/PaperView.svelte";
  import * as m from "$lib/paraglide/messages.js";
</script>

<svelte:head>
  <title>{m.logo()} | {m.paper_title_full()}</title>
</svelte:head>

<PaperView />
