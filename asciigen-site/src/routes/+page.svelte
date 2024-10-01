<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import logo from '../images/trimmed.png';
  import Image from '../components/image.svelte';
  import Text from '../components/text.svelte';
  import Video from '../components/video.svelte';
  import Camera from '../components/camera.svelte';
  var type = "image";

  export let format = null;

  let currentImageData;
  let currentArgs;

  function copyToClipboard() {
    navigator.clipboard.writeText(sharing_link).then(function() {
    }, function(err) {
      console.error("Error copying text: ", err);
    });
  }

  function shareItem()
  {
    //sharing api removed.
  }

</script>

<div class="flex flex-row justify-center">
  <a href="/"><img src={logo} alt="deez" class="pt-8 px-4" width={500}/></a>
</div>

<div class="text-center
font-mono font-bold text-gray-800 gap-3 text-base mt-2 mb-2">
<p class="">Asciigen by: <a href="https://x.com/seatedro" class="text-blue-700 hover:text-blue-800" target="_blank">@seatedro</a></p>
<p class="">Asciigen-WASM/WebGPU/site by: <a href="https://x.com/gabe_burnette" class="text-blue-700 hover:text-blue-800" target="_blank">@gabe_burnette</a></p>
</div>

{#if format == null}
  <div class="flex justify-center mb-4
  font-mono font-bold text-gray-800 gap-2 flex-wrap m-4">
  <button class="hover:text-gray-500 hover:underline [&[info='image']]:underline" info={type} on:click={() => {type = "image"}}>Image</button>
  <p class="select-none">|</p>
  <button class="hover:text-gray-500 hover:underline [&[info='text']]:underline" info={type} on:click={() => {type = "text"}}>Text</button>
  <p class="select-none">|</p>
  <button class="hover:text-gray-500 hover:underline [&[info='video']]:underline" info={type} on:click={() => {type = "video"}}>Video</button>
  <p class="select-none">|</p>
  <button class="hover:text-gray-500 hover:underline [&[info='camera']]:underline" info={type} on:click={() => {type = "camera"}}>Camera</button>
  </div>

  {#if type == "image"}
  <Image changeType={(e) => {type = e;}} bind:currentImageData bind:currentArgs share={shareItem}></Image>
  {:else if type == "text"}
  <Text changeType={(e) => {type = e;}} bind:currentImageData bind:currentArgs share={shareItem}></Text>
  {:else if type == "video"}
  <Video></Video>
  {:else if type == "camera"}
  <Camera></Camera>
  {/if}
  <!-- Sharing function -->
  <!-- <div class="flex justify-center items-center font-mono font-bold text-gray-800 mt-4">
    <div class="p-2 outline-dashed outline-1 rounded-lg flex justify-center items-center flex-col">
      <div class="flex gap-2">
        <p class="text-center">Saves: 0</p>
      </div>
      <div class="flex gap-2 mt-1">
        <p class="text-center">Page: 1/1</p>
        <button class="bg-gray-300 rounded-md px-2 hover:bg-gray-200">Back</button>
        <button class="bg-gray-300 rounded-md px-2 hover:bg-gray-200">Next</button>
      </div>
      <div class="p-2 flex flex-wrap justify-center items-center gap-2">
        <div class="w-[200px] h-[200px] bg-blue-300 rounded-lg">

        </div>
        <div class="w-[200px] h-[200px] bg-blue-300 rounded-lg">

        </div>
      </div>
    </div>
  </div> -->
{:else}
  <div class="text-center
  font-mono font-bold text-gray-800 my-5 flex flex-col flex-wrap justify-center items-center gap-2">
    <h1>Shared link detected. Please verify you're not a bot.</h1>
    <h1>{turnstileStatus}</h1>
    <div id="turnstile-widget"></div>
  </div>
{/if}

<div class="flex justify-center
font-mono font-bold text-gray-800 gap-2 flex-wrap mb-20 flex-col items-center mt-2">
<p>Asciigen-WASM v0.14a - Runs locally.</p>
<div class="flex justify-center items-center gap-2">
<a class="hover:text-gray-500 hover:underline" href="https://github.com/gabe-burnette/asciigen-wasm" target="_blank">Github</a>
<p class="select-none">|</p>
<a class="hover:text-gray-500 hover:underline" href="https://github.com/gabe-burnette/asciigen-wasm/issues" target="_blank">Request Feature</a>
<p class="select-none">|</p>
<a class="hover:text-gray-500 hover:underline" href="https://github.com/gabe-burnette/asciigen-wasm/issues" target="_blank">Report Bug</a>
</div>
</div>
