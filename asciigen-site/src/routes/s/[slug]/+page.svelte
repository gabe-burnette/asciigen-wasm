<script>
  import { page } from '$app/stores';
  import Page from '../../+page.svelte';

  $: slug = $page.params.slug;

</script>

<Page format={slug}></Page>