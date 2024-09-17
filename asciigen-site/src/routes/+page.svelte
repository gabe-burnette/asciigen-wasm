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

  $: slug = $page.params.slug;
  console.log(slug);

  onMount(() => 
  {
    dialog_.style.visibility="hidden";
    var type_ = sessionStorage.getItem('type');
    if(type_)
    {
      type = type_;
      sessionStorage.removeItem('type');
    }
  });

  var firstUpdate = false;
  $: if(type)
  {
    if(firstUpdate)
    {
      sessionStorage.setItem('type', type);
      goto('/');
    }
    else
    {
      firstUpdate = true;
    }
  }

  let currentImageData;
  let currentArgs;

  let turnstileWidget;
  let sitekey = '0x4AAAAAAAj65it6opvx8OsH'; //public key for lmao, doesn't matter, will fail if not site origin
  let turnstileStatus = "Please wait.";

  let dialog_;
  let sharing_detected = false;
  let sharing_status = "";
  let sharing_link = null;

  function copyToClipboard() {
    navigator.clipboard.writeText(sharing_link).then(function() {
    }, function(err) {
      console.error("Error copying text: ", err);
    });
  }

  const API_URL = 'https://api.asciigen.com';

  function shareItem()
  {
    sharing_status = "";
    sharing_link = null;
    dialog_.style.visibility="visible";
    sharing_status = "Loading Cloudflare Turnstile. Please verify you're not a bot.";
    sharing_detected = true;
    try
    {
      turnstileWidget = turnstile.render('#turnstile-widget2', {
      sitekey: sitekey,
      callback: async function(token) {
          sharing_status = "Verified user. Getting share link.";
          try
          {
            const formData = new FormData();
            formData.append('image', currentImageData);
            formData.append('options', JSON.stringify(currentArgs));
            formData.append('turnstile', token);
            //fix is correctly later
            fetch(`${API_URL}/new`, {
              method: 'POST',
              body: formData,
            })
            .then(response => {
              if (!response.ok) {
                return response.text().then(errorBody => {
                  throw new Error(`${response.status} ${response.statusText}. Response body: ${errorBody}`);
                });
              }
              return response.json();
            })
            .then(data => {
              sharing_link = "https://asciigen.com/s/" + data.shareLink;
              history.pushState(null, '', '/s/' + data.shareLink);
            })
            .catch(error => {
              console.log(error);
              sharing_status = `Failed to upload new image. ${error.message}. Please try in 15s. Possible Rate limit error.`;
            });
          }
          catch(e)
          {
            console.log(e);
            sharing_status = "Failed to upload new image. Something on our end. Please try again later.";
          }
          currentImageData = null;
          currentArgs = null;
          turnstile.remove(turnstileWidget);
        },
        'error-callback': function() {
          sharing_status = "Turnstile encountered an error. Reload close this and try sharing again.";
          currentImageData = null;
          currentArgs = null;
          turnstile.remove(turnstileWidget);
        },
        'expired-callback': function() {
          sharing_status = "Turnstile encountered an error. Reload close this and try sharing again.";
          currentImageData = null;
          currentArgs = null;
          turnstile.remove(turnstileWidget);
        },
        'timeout-callback': function() {
          sharing_status = "Turnstile encountered an error. Reload close this and try sharing again.";
          currentImageData = null;
          currentArgs = null;
          turnstile.remove(turnstileWidget);
        }
      });
    }
    catch
    {

    }
  }

  onMount(() => {
    if(true)
    {
      if(format)
        {
          turnstileWidget = turnstile.render('#turnstile-widget', {
          sitekey: sitekey,
          callback: async function(token) {
            turnstileStatus = "Success! Loading shared content.";

            const formData = new FormData();
            formData.append('shareKey', format);
            formData.append('turnstile', token);

            var response = null;
            try
            {
              response = await fetch(`${API_URL}/existing`, {
                method: 'POST',
                body: formData,
              });
            }
            catch
            {

            }

            if (response.ok) {
              const contentType = response.headers.get('Content-Type');
              const options = response.headers.get('Options-data');
              currentArgs = JSON.parse(options);
              const arrayBuffer = await response.arrayBuffer();
              const blob = new Blob([arrayBuffer], { type: contentType });
              const extension = contentType.split('/')[1];
              const filename = `image.${extension}`;
              const file = new File([blob], filename, { type: contentType });
              currentImageData = file;
            } else {
              console.error('Failed to retrieve existing image:', await response.text());
            }
            format = null;
            turnstile.remove(turnstileWidget);
            //load api
            //storage image in session storage
            //reload
          },
          'error-callback': function() {
            turnstileStatus = "Turnstile encountered an error. Reload your page.";
            turnstile.remove(turnstileWidget);
          },
          'expired-callback': function() {
            turnstileStatus = "Turnstile encountered an error. Reload your page.";
            turnstile.remove(turnstileWidget);
          },
          'timeout-callback': function() {
            turnstileStatus = "Turnstile encountered an error. Reload your page.";
            turnstile.remove(turnstileWidget);
          }
        });
        }
    }
    
  },() => {
    if (turnstileWidget && format) {
      turnstile.remove(turnstileWidget);
    }
  });
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

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

<div bind:this={dialog_} class="fixed bottom-0 left-0 right-0 w-full h-full font-mono font-bold text-gray-800 p-4 backdrop-blur-sm" style="z-index:100000;">
  <div class="flex justify-center items-center w-full h-full">
    <div class="w-full max-w-[400px] bg-white text-center rounded-xl flex flex-col gap-2 p-4 relative shadow-lg">
      <button 
        class="absolute right-2 top-2 hover:bg-gray-300 p-2 px-3 bg-gray-200 rounded-lg opacity-75 active:bg-gray-400"
        on:click={() => {dialog_.style.visibility="hidden"}}
      >
        X
      </button>
      <p class="mt-8">{sharing_status}</p>
      {#if sharing_link}
        <input
          type="text"
          value={sharing_link}
          readonly
          on:click={(e) => e.target.select()}
          class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
        <button 
          on:click={(e) => {
            copyToClipboard();
            e.target.innerText = "Copied!";
          }} 
          class="p-2 bg-green-300 hover:bg-green-200 rounded-lg w-full mt-2"
        >
          Copy to clipboard
        </button>
        <button 
          on:click={() => {dialog_.style.visibility="hidden"}} 
          class="p-2 bg-red-300 hover:bg-red-200 rounded-lg w-full mt-2"
        >
          Close
        </button>
      {/if}
      <div id="turnstile-widget2" class="mt-4"></div>
    </div>
  </div>
</div>


<div class="flex justify-center
font-mono font-bold text-gray-800 gap-2 flex-wrap mb-20 flex-col items-center mt-2">
<p>Asciigen-WASM v0.12a - Runs locally.</p>
<div class="flex justify-center items-center gap-2">
<a class="hover:text-gray-500 hover:underline" href="https://github.com/gabe-burnette/asciigen-wasm" target="_blank">Github</a>
<p class="select-none">|</p>
<a class="hover:text-gray-500 hover:underline" href="https://github.com/gabe-burnette/asciigen-wasm/issues" target="_blank">Request Feature</a>
<p class="select-none">|</p>
<a class="hover:text-gray-500 hover:underline" href="https://github.com/gabe-burnette/asciigen-wasm/issues" target="_blank">Report Bug</a>
</div>
</div>