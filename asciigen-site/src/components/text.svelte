<script>
  import { onMount } from 'svelte';
  import image_worker from '../components/image_worker?worker&inline'
  import { goto } from '$app/navigation';

  export let changeType;
  function changeTo()
  {
    asciigen_worker.postMessage({original_image:true});
  }

  export let currentImageData;
  export let currentArgs;
  export let share;
  let checkIfShare = false;

  async function getOptions()
  {
    const submit_args = 
    {
      color: color,
      invert_image: invert,
      scale: scale,
      edge_detection: edgeDetection,
      sigma1: sigma1,
      sigma2: sigma2,
      brightness: brightness,
      full_chars: fullCharacters,
      block_size: blockSize,
      threshold: disableThreshold,
      custom_characters: useCustomCharacters,
      chars: customCharacters,
      chars_sorted: sortCharacters,
      custom_color: customColor_enabled,
      color_hex: customColor,
      background_color: backgroundColor_enabled,
      background: backgroundColor,
      bg_a: backgroundTransparency,
    };
    return submit_args;
  }
  async function setOptions(args)
  {
    color = args.color;
    invert = args.invert_image;
    scale = args.scale;
    brightness = args.brightness;
    customColor_enabled = args.custom_color;
    customColor = args.color_hex;
    backgroundColor_enabled = args.background_color;
    backgroundColor = args.background;
    backgroundTransparency = args.bg_a;
    edgeDetection = args.edge_detection;
    sigma1 = args.sigma1;
    sigma2 = args.sigma2;
    disableThreshold = args.threshold;
    blockSize = args.block_size;
    fullCharacters = args.full_chars;
    useCustomCharacters = args.custom_characters;
    customCharacters = args.chars;
    sortCharacters = args.chars_sorted;
    update();
  }

  var image_active = false;
  var is_original = false;
  var loading_image = false;
  var submit_args = {};

  $: if (!image_active) {
    if(asciigen_worker)
    {
      asciigen_worker.postMessage({unloadImage: true});
    }
  }

  // Handle drag-and-drop
  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          original_saved_file = file;
          const reader = new FileReader();
          reader.onload = function (event) {
            loadImage(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  // Handle file click
  function clickToLoad() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*'; // Only accept image files
    input.onchange = function () {
      const file = input.files[0];
      original_saved_file = file;
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (event) {
          loadImage(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // Load image from an imported example (replace with actual image path)
  function loadExampleImage() {
    fetch('./dingboard.png')
    .then(response => response.blob())
    .then(blob => {
      const file = new File([blob], "dingboard.png", { type: blob.type });
      original_saved_file = file;
      const reader = new FileReader();
      
      reader.onload = function (event) {
        loadImage(event.target.result);
      };
      
      reader.readAsDataURL(file);
    })
    .catch(error => console.error('Error loading image:', error));
    color = true;
    invert = false;
    scale = 3;
    brightness = 1;
    customColor_enabled = false;
    customColor = "#FFFFFF";
    backgroundColor_enabled = true;
    backgroundColor = "#000000";
    backgroundTransparency = 1;
    edgeDetection = false;
    sigma1 = 0.5;
    sigma2 = 1;
    disableThreshold = false;
    blockSize = 8;
    fullCharacters = false;
    useCustomCharacters = false;
    customCharacters = ' .:-=+*%@#';
    sortCharacters = false;
  }

  // Handle paste event
  function handlePaste(event) {
    const items = event.clipboardData.items;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          original_saved_file = file;
          const reader = new FileReader();
          reader.onload = function (event) {
            loadImage(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }
  var original_saved_file = null;
  function loadImage(data) {
    update();
    if (typeof data === 'string') {
      try
      {
        const img = new Image();
        img.src = data;
        img.onload = function () {
          var inputCanvas = new OffscreenCanvas(img.width, img.height);
          var ctx = inputCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var imageData = ctx.getImageData(0, 0, img.width, img.height);
          asciigen_worker.postMessage({setImage:true, args: submit_args, image:imageData.data.buffer, width: img.width, height: img.height}, [imageData.data.buffer])
          loading_image = true;
          image_active = true;
          currentArgs = null;
          currentImageData = null;
        };
      }
      catch
      {
        alert("The image you have entered is invalid or not supported.");
      }
    } else if (data instanceof HTMLImageElement) {
      try
      {
        var inputCanvas = new OffscreenCanvas(data.width, data.height);
        var ctx = inputCanvas.getContext('2d');
        ctx.drawImage(data, 0, 0);
        var imageData = ctx.getImageData(0, 0, data.width, data.height);
        asciigen_worker.postMessage({setImage:true, args: submit_args,image:imageData.data.buffer, width: data.width, height: data.height}, [imageData.data.buffer])
        loading_image = true;
        image_active = true;
      }
      catch
      {
        alert("The image you have entered is invalid or not supported.");
      }
    } else {
      console.error('The image you have entered is invalid or not supported.');
    }
  }

  function unloadImage()
  {
    sessionStorage.setItem('type', 'image');
    goto('/');
    image_active = false;
  }

  function reloadImage()
  {
    update();
    asciigen_worker.postMessage({setImage:true, args: submit_args, reloadImage: true})
  }

  function switchImageType()
  {
    is_original = !is_original;
    if(is_original)
    {
      asciigen_worker.postMessage({useImage: true, original: true});
    }
    else
    {
      asciigen_worker.postMessage({useImage: true, original: false});
    }
  }

  function imageUpdated()
  {
    loading_image = false;
    if(Object.keys(submit_args) != 0)
    {
      loading_image = true;
      asciigen_worker.postMessage({createImage: true, args: submit_args});
      submit_args = {};
    }
  }

  function download_image()
  {
    const text = text_table.textContent;
    // Create a Blob with the text data
    const blob = new Blob([text], { type: 'text/plain' });

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'asciigen_output.txt';

    // Append the anchor to the body (not visible)
    document.body.appendChild(link);

    // Programmatically click the anchor to trigger the download
    link.click();

    // Remove the anchor from the DOM
    document.body.removeChild(link);
  }

  var canvas = null;
  var canvas_offscreen = null;
  var asciigen_worker = null;

  function resizeCanvas()
  {
    if(asciigen_worker)
    {
      const bounding = canvas.getBoundingClientRect();
      asciigen_worker.postMessage({resizeCanvas:true, width: bounding.width, height:bounding.height});
    }
  }

  onMount(() => {
    window.addEventListener('paste', handlePaste);
    canvas.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'crisp-edges'; 

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    //firefox speedup fix ahhhh
    CanvasRenderingContext2D.prototype.clip = function () { };
    OffscreenCanvasRenderingContext2D.prototype.clip = function () { };

    asciigen_worker = new image_worker();
    asciigen_worker.onmessage = async (e) =>
    {
      if(e.data.original_image_data)
      {
        currentImageData = original_saved_file;
        currentArgs = await getOptions();
        if(checkIfShare)
        {
          share();
        }
        else
        {
          changeType("image");
        }
        checkIfShare = false;
        return;
      }
      if(e.data.text)
      {
        text_pre = "";
        const array1 = e.data.data;
        const width1 = e.data.width;
        const height1 = e.data.height;

        for (let row = 0; row < height1; row++) {
            for (let col = 0; col < width1; col++) {
                // Calculate the index for the current pixel (char code)
                const index = row * width1 + col;
                
                // Convert the char code to a character and append it to the result
                var cha1 = String.fromCharCode(array1[index]);
                text_pre += cha1 + " ";
            }
            // Add a newline after each row, except for the last row
            if (row < height1 - 1) {
              text_pre += '\n';
            }
        }
        return;
      }
      if(e.data.init)
      {
        webgpu_status = e.data.webgpu;
        if(currentImageData && currentArgs)
        {
          setOptions(currentArgs);

          const file = currentImageData;
          original_saved_file = file;
          if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (event) {
              loadImage(event.target.result);
            };
            reader.readAsDataURL(file);
          }
        }
        return;
      }
      if(e.data.imageUpdated)
      {
        imageUpdated();
        return;
      }
      if (e.data.type === 'updateView') {
        scale_ = e.data.scale;
        offsetX = e.data.offsetX;
        offsetY = e.data.offsetY;
        return;
      }
      if(e.data.download)
      {
        const url = e.data.data;
        var link = document.createElement('a');
        link.download = 'for_cherished_user.png';
        link.href = url;
        link.click();
        return;
      }
    }
    canvas_offscreen = canvas.transferControlToOffscreen();
    const bounding = canvas.getBoundingClientRect();
    asciigen_worker.postMessage({init:true, canvas: canvas_offscreen, canvas_width: bounding.width, canvas_height:bounding.height}, [canvas_offscreen]);
    return () => {
      window.removeEventListener('paste', handlePaste);
      asciigen_worker.terminate();
      if (canvas) {
        resizeObserver.unobserve(canvas);
      }
    };
  });

  

  let color = false;
  let invert = false;
  let scale = 1;
  let brightness = 1;
  let customColor_enabled = true;
  let customColor = "#FFFFFF";
  let backgroundColor_enabled = true;
  let backgroundColor = "#000000";
  let backgroundTransparency = 1;
  let edgeDetection = false;
  let sigma1 = 0.5;
  let sigma2 = 1;
  let disableThreshold = false;
  let blockSize = 8;
  let fullCharacters = false;
  let useCustomCharacters = true;
  let customCharacters = ' .:-=+*%@#';
  let sortCharacters = false;

  function resetOptions()
  {
    color = false;
    invert = false;
    scale = 1;
    brightness = 1;
    customColor_enabled = true;
    customColor = "#FFFFFF";
    backgroundColor_enabled = true;
    backgroundColor = "#000000";
    backgroundTransparency = 1;
    edgeDetection = false;
    sigma1 = 0.5;
    sigma2 = 1;
    disableThreshold = false;
    blockSize = 8;
    fullCharacters = false;
    useCustomCharacters = false;
    customCharacters = ' .:-=+*%@#';
    sortCharacters = false;

    update(true)
  }

  function update(real) {
    function hexToRgb(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }

    const rgb_custom = hexToRgb(customColor);
    const rgb_background = hexToRgb(backgroundColor);
    submit_args = 
    {
      color: color,
      invert_image: invert,
      scale: scale,
      edge_detection: edgeDetection,
      sigma1: sigma1,
      sigma2: sigma2,
      brightness: brightness,
      full_chars: fullCharacters,
      block_size: blockSize,
      threshold: disableThreshold,
      custom_characters: useCustomCharacters,
      chars: customCharacters,
      chars_sorted: sortCharacters,
      custom_color: customColor_enabled,
      r: rgb_custom.r,
      g: rgb_custom.g,
      b: rgb_custom.b,
      background_color: backgroundColor_enabled,
      bg_r: rgb_background.r,
      bg_g: rgb_background.g,
      bg_b: rgb_background.b,
      bg_a: Math.round(backgroundTransparency * 255),
      text_only: true,
    }
    if(submit_args.color)
    {
      submit_args.custom_color = false;
    }
    else
    {
      submit_args.custom_color = true;
    }
    if(real)
    {
      if(!loading_image)
      {
        loading_image = true;
        asciigen_worker.postMessage({createImage: true, args: submit_args});
        submit_args = {};
      }
    }
    
  }


  let lastDist = null;
  let isDragging = false;
  let pinchCenterX = 0;
  let pinchCenterY = 0;
  let lastX = 0;
  let lastY = 0;
  let scale_ = 1;
  let offsetX = 0;
  let offsetY = 0;

  function handleMouseDown(event) {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function handleMouseMove(event) {
    if (!isDragging) return;
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    asciigen_worker.postMessage({ type: 'pan', deltaX, deltaY });
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    asciigen_worker.postMessage({ type: 'zoom', delta, x, y });
  }

  // Handle touch start
  function handleTouchStart(event) {
    if (event.touches.length === 1) {
      isDragging = true;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      // Handle pinch start by resetting lastDist
      isDragging = false; // Disable dragging when pinch is detected
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      lastDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      // Capture the midpoint of the two fingers
      pinchCenterX = (touch1.clientX + touch2.clientX) / 2;
      pinchCenterY = (touch1.clientY + touch2.clientY) / 2;
    }
  }

  // Handle touch move (dragging and pinching)
  function handleTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1 && isDragging) {
      // Handle drag
      const touch = event.touches[0];
      const deltaX = touch.clientX - lastX;
      const deltaY = touch.clientY - lastY;
      asciigen_worker.postMessage({ type: 'pan', deltaX, deltaY });
      lastX = touch.clientX;
      lastY = touch.clientY;
    } else if (event.touches.length === 2) {
      // Handle pinch and zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      if (lastDist) {
        const delta = dist / lastDist;

        // Get the midpoint of the pinch
        const pinchX = (touch1.clientX + touch2.clientX) / 2;
        const pinchY = (touch1.clientY + touch2.clientY) / 2;

        // Calculate the change in pinch center relative to previous pinch center
        const deltaX = pinchX - pinchCenterX;
        const deltaY = pinchY - pinchCenterY;

        // Adjust the zoom to focus on the point of the pinch
        asciigen_worker.postMessage({ type: 'zoom', delta, x: pinchX, y: pinchY });

        // Optional: You can adjust panning based on pinch movement
        asciigen_worker.postMessage({ type: 'pan', deltaX, deltaY });

        // Update the pinch center for the next frame
        pinchCenterX = pinchX;
        pinchCenterY = pinchY;
      }
      lastDist = dist;
    }
  }

  // Handle touch end
  function handleTouchEnd(event) {
    if (event.touches.length === 0) {
      // Reset dragging and pinch states when all touches are lifted
      isDragging = false;
      lastDist = null;
    } else if (event.touches.length === 1) {
      // Re-enable dragging if only one touch remains
      isDragging = true;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      lastDist = null; // Reset pinch distance
    }
  }

  var text_table = null;

  function zoomIn() {
    text_table.style.fontSize = `calc(calc(${text_table.style.fontSize}) + 0.5px)`;
    //asciigen_worker.postMessage({ type: 'zoom', delta: 1.1, x: canvas.width / 2, y: canvas.height / 2 });
  }

  function zoomOut() {
    text_table.style.fontSize = `calc(calc(${text_table.style.fontSize}) - 0.5px)`;
    //asciigen_worker.postMessage({ type: 'zoom', delta: 0.9, x: canvas.width / 2, y: canvas.height / 2 });
  }

  function reset() {
    //asciigen_worker.postMessage({ type: 'reset' });
  }

  var webgpu_status = false;
  var webgpu_type = false;
  function updateWebGPUStatus(value) {
    webgpu_type = value === 'webgpu';
    asciigen_worker.postMessage({ webgpu_set: true, webgpu_active: webgpu_type });
    reloadImage();
    //post message for change
  }

  var text_pre = "Test";

</script>

<svelte:document on:resize={resizeCanvas}/>

<div class="flex justify-center gap-5 px-5
font-mono font-bold text-gray-800
flex-col lg:flex-row">
<div class="max-w-[1024px] lg:w-full h-[500px] rounded-lg outline-1 outline-dashed">
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="w-full h-full flex flex-col justify-center items-center text-center gap-5 relative">
    <div class="w-full h-full flex justify-center items-center overflow-hidden">
      <!-- Add click stuff for canvas -->
      {#if loading_image && image_active}
        <div class="absolute w-full h-full pointer-events-none" style="z-index: 1000;">
          <div class="absolute top-0 left-0 bg-white text-red-400 p-2 m-2 rounded-lg">
            Loading new image...
          </div>
        </div>
      {/if}
      <canvas class="hidden" bind:this={canvas}></canvas>
      <pre contenteditable={true} class=" [&[drag=true]]:bg-blue-300 overflow-auto w-full h-full align-middle text-center"
           bind:this={text_table}
           style="font-size: 12px; max-height: 100%; max-width: 100%; overflow: auto; white-space: pre; word-wrap: normal;"
           on:dragenter={(e) => {e.target.setAttribute('drag', true);}}
           on:dragexit={(e) => {e.target.setAttribute('drag', false);}}
           on:dragover={(e) => {e.preventDefault();}}
           on:drop={(e) => {onDrop(e); e.target.setAttribute('drag', false);}}>
        {text_pre}
      </pre>
        {#if image_active}
        <div class="absolute right-3 top-3 flex justify-center gap-2 flex-wrap p-2">
          <button class=" hover:bg-gray-300 mt-1 mr-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75  active:bg-gray-400" style="z-index: 100;"
          on:mousedown={unloadImage}>X</button>
        </div>
          
          <div class="absolute right-5 bottom-5 flex justify-center gap-2 flex-wrap p-2">
            <!-- <button class="-mt-1 p-1 px-2 rounded-lg opacity-75 select-none cursor-auto text-gray-400">Drag and move around</button>
            {#if is_original}
              <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={switchImageType}>ASCII</button>
            {:else}
              <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={switchImageType}>Original</button>
            {/if} -->
            
            <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={download_image}>↓</button>
            <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={zoomOut}>-</button>
            <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={zoomIn}>+</button>
            <!-- <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={reset}>Reset view</button> -->
          </div>
        {/if}
      </div>
      {#if !image_active}
      <div class="w-full h-full absolute flex justify-center items-center flex-col gap-3  [&[drag=true]]:bg-blue-300 bg-white" style="z-index: 1000;"
        on:dragenter={(e) => {e.target.setAttribute('drag', true);}}
        on:dragexit={(e) => {e.target.setAttribute('drag', false);}}
        on:dragover={(e) => {e.preventDefault();}}
        on:drop={(e) => {onDrop(e); e.target.setAttribute('drag', false);}}
      >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <p class="hover:cursor-pointer select-none hover:text-blue-600 active:text-blue-700" on:click={clickToLoad}>Drag your image into this panel<br>
            or click here to open an image. Or paste your image (ctrl + v).</p>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <p class="hover:cursor-pointer select-none hover:text-blue-600 active:text-blue-700" on:click={loadExampleImage}>Click here to load an example image.</p>
       </div>
      {/if}
    </div>
  </div>
  {#if image_active}
  <div class="lg:w-1/2 lg:max-w-[500px] md:w-full flex flex-col gap-2 md:h-[500px]">
    <div class="flex justify-center flex-col p-3 overflow-auto rounded-lg outline-1 outline-dashed">
      <div class="w-full h-full flex flex-col text-lg gap-2">
        <p class="text-center mt-2">Image:</p>
        <!-- <label>
          <span>Name: </span> 
          <input type="text" class="w-full outline outline-1 p-1 rounded-lg"/>
        </label> -->
        <div class="flex justify-center flex-wrap gap-2">
          <button on:click={download_image} class="bg-green-200 hover:bg-green-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Download text</button>
        <button on:click={resetOptions} class="bg-yellow-200 hover:bg-yellow-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Reset Options</button>
       
        <!-- <button class="bg-gray-200 rounded-lg outline-1 outline-dashed w-[200px]">Save to collections</button> -->
        <button on:click={reloadImage} class="bg-blue-200 hover:bg-blue-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Refresh text</button>
        <button on:click={unloadImage} class="bg-red-200 hover:bg-red-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">New image</button>
        <button class="hover:bg-cyan-100 bg-cyan-200 rounded-lg outline-1 outline-dashed w-[200px] p-1" on:click={changeTo}>Switch to image</button>
        <button class="hover:bg-orange-100 bg-orange-200 rounded-lg outline-1 outline-dashed w-[200px] p-1" on:click={() => {checkIfShare = true; changeTo();}}>Share</button>
        </div>
        <p class="text-center mt-2">Options:</p>
        <!-- <label>
          <span>Text output: </span> 
          <input type="checkbox"/>
        </label> -->
        <!-- <label>
          <span>Image Colors: </span> 
          <input type="checkbox" bind:checked={color} on:change={update}/>
        </label>
        <label>
          <span>Invert: </span> 
          <input type="checkbox" bind:checked={invert} on:change={update}/>
        </label> -->
        <label>
          <span>Scale: </span> 
          <input type="number" class="outline outline-1 p-1 rounded-lg" min="0.10" step="0.05" bind:value={scale} on:change={update}/>
          <input class="w-full h-[25px]" type="range" min="0.10" max="4" step="0.05" bind:value={scale} on:change={update}/>
        </label>
        <label>
          <span>Brightness: </span> 
          <input type="number" class="outline outline-1 p-1 rounded-lg" min="0" step="0.1" bind:value={brightness} on:change={update}/>
          <input type="range" class="w-full" min="0" max="2" step="0.1" bind:value={brightness} on:change={update}/>
        </label>
        <!-- <label>
          <span>Custom Color Enabled: </span> 
          <input type="checkbox" bind:checked={customColor_enabled} on:change={update}/>
        </label> -->
        <!-- <label>
          <span>Color: </span> 
          <input type="color" class="w-full outline outline-1 p-1 rounded-lg" bind:value={customColor} on:change={update}/>
        </label> -->
        <!-- <label>
          <span>Background Color Enabled: </span> 
          <input type="checkbox" bind:checked={backgroundColor_enabled} on:change={update}/>
        </label> -->
        <!-- <label>
          <span>Background Color: </span> 
          <input type="color" class="w-full outline outline-1 p-1 rounded-lg" bind:value={backgroundColor} on:change={update}/>
        </label>
        <label>
          <span>Background transparency: </span> 
          <input type="number" class="w-full outline outline-1 p-1 rounded-lg" min="0" step="0.01" bind:value={backgroundTransparency} on:change={update}/>
          <input type="range" class="w-full" min="0" max="1" step="0.01" bind:value={backgroundTransparency} on:change={update}/>
        </label> -->
        <label>
          <span>Edge Detection: </span> 
          <input type="checkbox" bind:checked={edgeDetection} on:change={update}/>
        </label>
        <label>
          <span>Sigma 1: </span> 
          <input type="number" class="outline outline-1 p-1 rounded-lg my-2" min="0" step="0.1" bind:value={sigma1} on:change={update}/>
        </label>
        <label>
          <span>Sigma 2: </span> 
          <input type="number" class="outline outline-1 p-1 rounded-lg my-2" min="0" step="0.1" bind:value={sigma2} on:change={update}/>
        </label>
        <!-- <label>
          <span>Disable Threshold: </span> 
          <input type="checkbox" bind:checked={disableThreshold} on:change={update}/>
        </label> -->
        <!-- <label>
          <span>Block size: </span> 
          <input type="number" class="outline outline-1 p-1 rounded-lg my-2" bind:value={blockSize} on:input={update}/>
        </label> -->
        <!-- <label>
          <span>Full characters: </span> 
          <input type="checkbox" bind:checked={fullCharacters} on:change={update}/>
        </label>
        <label>
          <span>Use custom characters: </span> 
          <input type="checkbox" bind:checked={useCustomCharacters} on:change={update}/>
        </label> -->
        <!-- <label>
          <span>Characters (Smallest to Biggest):</span> 
          <textarea bind:value={customCharacters} on:input={update} class="outline outline-1 p-1 rounded-lg my-2 w-full"></textarea>
        </label>
        <p class="text-center mt-2">Advanced Options:</p>
        <span>Asciigen Renderer:</span>
        <label class="text-green-500">
          <input type="radio" name="renderer" value="wasm" checked={!webgpu_type} on:change={() => updateWebGPUStatus('wasm')}> WASM
        </label>
        <label class="text-red-700">
          <input type="radio" name="renderer" value="webgpu" checked={webgpu_type} on:change={() => updateWebGPUStatus('webgpu')} disabled={!webgpu_status}> WebGPU (testing only)
        </label>
        <span class="pb-5">WebGPU Supported? {webgpu_status ? "Yes.": "No."}</span> -->
        <!-- <label>
          <span>Sort characters: </span> 
          <input type="checkbox" bind:checked={sortCharacters} on:change={update}/>
        </label> -->
      </div>
    </div>
</div>
  
  {/if}
</div>