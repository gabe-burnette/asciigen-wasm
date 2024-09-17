<script>
  import { onMount } from 'svelte';
  import { FFmpeg } from '@ffmpeg/ffmpeg'
  import {mediaInfoFactory} from 'mediainfo.js';
  import image_worker from '../components/image_worker?worker&inline'
  import video_worker from '../components/video_worker?worker&inline'

  let ffmpeg;
  var ffmpeg_loaded = "Not loaded. Please wait.";
  var progress_data = "";

//#region Random voids

  async function detectPrivateMode() {
    return await new Promise(resolve => {
      const yes = () => resolve(true); // is in private mode
      const not = () => resolve(false); // not in private mode

      // iOS Safari and some Android browsers
      if (window.webkit && window.webkit.messageHandlers) {
        try {
          window.localStorage.setItem('test', '1');
          window.localStorage.removeItem('test');
          not();
        } catch (e) {
          yes();
        }
        return;
      }

      // Other mobile browsers and desktop
      if (navigator.userAgent.includes("Chrome")) {
        const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
        if (!fs) return not();
        fs(window.TEMPORARY, 100, not, yes);
      } else if (navigator.userAgent.includes("Firefox")) {
        const db = indexedDB.open('test');
        db.onerror = yes;
        db.onsuccess = not;
      } else if (navigator.userAgent.includes("Safari")) {
        try {
          window.openDatabase(null, null, null, null);
          not();
        } catch (_) {
          yes();
        }
      } else {
        // Default for other browsers
        try {
          const storage = window.sessionStorage;
          storage.setItem('test', '1');
          storage.removeItem('test');
          not();
        } catch (e) {
          yes();
        }
      }
    });
  }

  function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Check for iPhone, iPad, Android, Windows Phone, etc.
    if (/android/i.test(userAgent)) {
      return true;
    }
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return true;
    }
    if (/Windows Phone|iemobile|wpdesktop/i.test(userAgent)) {
      return true;
    }
    if (/BlackBerry|BB10|PlayBook/i.test(userAgent)) {
      return true;
    }

    return false;
  }

  async function detectCORSSettings() {
    const sameOriginEnabled = window.origin !== "null";
    
    let requireCorpEnabled = false;
    
    try {
      // Attempt to create a cross-origin iframe
      const iframe = document.createElement('iframe');
      iframe.src = 'https://example.com';
      document.body.appendChild(iframe);
      
      // If we can access the iframe's content, require-corp is not enabled
      iframe.contentWindow.document;

      document.body.removeChild(iframe);
    } catch (error) {
      // If we get a security error, require-corp is likely enabled
      if (error instanceof DOMException && error.name === 'SecurityError') {
        requireCorpEnabled = true;
      }
    }
    
    return {
      sameOriginEnabled,
      requireCorpEnabled
    };
  }

  async function loadFFmpeg()
  {
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress, time }) => {
      progress_data = `${(progress * 100).toFixed(2)} % (transcoded time: ${(time / 1000000).toFixed(2)} s)`;
    });
    ffmpeg.on('log', ({type, message}) =>
    {
      //console.log(type + " | " + message);
    });
    ffmpeg_loaded = "Loading FFmpeg WASM... Please wait...";
    await ffmpeg.load({
        coreURL: files.core_ffmpeg,
        wasmURL: files.wasm_ffmpeg,
        workerURL: files.worker_ffmpeg
      });
    
    ffmpeg_loaded = "Loaded.";
    issues = "";
  }

//#endregion

  var files;
  var issues = "";
  var status = "Drop"
  
  onMount(async () =>
  {
    issues += "Initializing. ";
    try
    {
      const origin_ = await detectCORSSettings();
      const private_ = await detectPrivateMode();
      const isMobile_ = isMobile();
      if(!origin_.sameOriginEnabled)
      {
        issues += "Same Origin is not enabled. FFmpeg may not work. "
      }
      if(private_)
      {
        issues += "Private browsing may prevent Shared Buffer Array from working. "
      }
      if(issues)
      {
        issues += "Try another browser or clear cache, if this doesn't work. "
      }
      setTimeout(() => 
      {
        if(ffmpeg_loaded != "Loaded.")
        {
          ffmpeg_loaded = "Initialized failed. "
        }
        else
        {
          issues = "";
        }
      }, 10000)
      const version = '1.05';
      const singleFiles = [
        { url: '/ffmpeg-core.js', name: 'core_ffmpeg', version: version, mimeType: 'text/javascript' },
        { url: '/ffmpeg-core.worker.js', name: 'worker_ffmpeg', version: version, mimeType: 'text/javascript' }
      ];

      const combinedFiles = [
        { url1: '/ffmpeg-core.wasm.part1', url2: '/ffmpeg-core.wasm.part2', name: 'wasm_ffmpeg', version: version, mimeType: 'application/wasm' }
      ];
      files = await loadFiles(singleFiles, combinedFiles);
      await loadFFmpeg();
      //ffmpeg loaded
    }
    catch(e)
    {
      issues += e + ". ";
      ffmpeg_loaded = "Initialized failed. "
      if(isMobile())
      {
        ffmpeg_loaded += "MOBILE ONLY: TRY CLOSING AND REOPENING YOUR BROWSER APP.";
      }
    }
  }, () =>
  {
    ffmpeg.terminate();
  });

//#region IndexedDB
const dbName = 'FileStorage';
const storeName = 'files';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = (event) => reject("IndexedDB error: " + event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: 'name' });
    };
  });
}

async function storeFile(db, file) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(file);
    request.onerror = (event) => reject("Error storing file: " + event.target.error);
    request.onsuccess = () => resolve();
  });
}

async function getFile(db, name) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(name);
    request.onerror = (event) => reject("Error getting file: " + event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

async function fetchAndStoreFile(db, url, name, version, mimeType) {
  const existingFile = await getFile(db, name);
  if (existingFile && existingFile.version === version) {
    return URL.createObjectURL(new Blob([existingFile.blob], { type: existingFile.mimeType }));
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: mimeType });
  await storeFile(db, { name, version, blob, mimeType });
  return URL.createObjectURL(blob);
}

async function fetchAndCombineFiles(db, url1, url2, name, version, mimeType) {
  const existingFile = await getFile(db, name);
  if (existingFile && existingFile.version === version) {
    return URL.createObjectURL(new Blob([existingFile.blob], { type: existingFile.mimeType }));
  }

  const [response1, response2] = await Promise.all([fetch(url1), fetch(url2)]);
  const [arrayBuffer1, arrayBuffer2] = await Promise.all([response1.arrayBuffer(), response2.arrayBuffer()]);
  
  const combinedBlob = new Blob([arrayBuffer1, arrayBuffer2], { type: mimeType });
  await storeFile(db, { name, version, blob: combinedBlob, mimeType });
  return URL.createObjectURL(combinedBlob);
}

async function loadFiles(singleFiles, combinedFiles) {
  const db = await initDB();
  const results = {};

  for (const file of singleFiles) {
    results[file.name] = await fetchAndStoreFile(db, file.url, file.name, file.version, file.mimeType);
  }

  for (const file of combinedFiles) {
    results[file.name] = await fetchAndCombineFiles(db, file.url1, file.url2, file.name, file.version, file.mimeType);
  }

  return results;
}

//#endregion

//#region FFmpeg functions
  async function onDrop(e) {
      e.preventDefault();
      e.stopPropagation();

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type.startsWith('video/')) {
            const file = items[i].getAsFile();
            const readChunk = async (chunkSize, offset) => new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
            const mediainfo = await mediaInfoFactory();
            const result_ = await mediainfo.analyzeData(file.size, readChunk);

            const reader = new FileReader();
            reader.onload = function (event) {
              loadVideo(event.target.result, result_);
            };
            reader.readAsArrayBuffer(file);
          }
        }
      }
  }

  async function clickToLoad() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*'; // Only accept image files
    input.onchange = async function () {
      const file = input.files[0];
      if (file && file.type.startsWith('video/')) {
        const readChunk = async (chunkSize, offset) => new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
        const mediainfo = await mediaInfoFactory();
        const result_ = await mediainfo.analyzeData(file.size, readChunk);

        const reader = new FileReader();
        reader.onload = function (event) {
          loadVideo(event.target.result, result_);
        };
        reader.readAsArrayBuffer(file);
      }
    };
    input.click();
  }

  var fps = "";
  var db = null;
  var media_info_ = null;
  var contains_audio = false;
  var frameCount = 0;
  var loaded_frame = 1;

  async function openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoProcessorDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('frames', { keyPath: 'id' });
      };
    });
  }

  async function loadVideo(video, info)
  {
    status = "Extracting";
    if(!video || !info)
    {
      status = "Drop";
      return;
    }
    fps = info.media.track[0].FrameRate;
    media_info_ = info;
    const videoData = new Uint8Array(video);
    const inputFileName = 'input.mp4';
    try
    {
      progress_data = "Writing data to FFmpeg";
      await ffmpeg.writeFile(inputFileName, videoData);
      progress_data = "Extracting frames.";
      await ffmpeg.exec(['-i', inputFileName, '-vf', `fps=${fps}`, 'frame%d.png']);

      contains_audio = false;
      for(var track = 0; track < media_info_.media.track.length; track++)
      {
        var hasTrack = media_info_.media.track[track]["@type"];
        if(hasTrack == "Audio")
        {
          contains_audio = true;
        }
      }
      if(contains_audio)
      {
        progress_data = "Extracting audio from video, if any";
        await ffmpeg.exec(['-i', inputFileName, '-vn', '-acodec', 'copy', 'audio.aac']);
      }

      let continueReading = true;
      progress_data = "Opening IndexedDB";
      progress_data = "Writing data to IndexedDB";
      db = await openIndexedDB();
      while (continueReading) {
        try {
          const frameData = await ffmpeg.readFile(`frame${frameCount + 1}.png`);
          const framesStore = db.transaction('frames', 'readwrite').objectStore('frames');
          await framesStore.put({ id: frameCount + 1, data: frameData });
          frameCount++;
          progress_data = "Storing Frames: " + frameCount;
        } catch (error) {
          continueReading = false;
        }
      }
      await ffmpeg.deleteFile(inputFileName);
      for (let i = 1; i <= frameCount; i++) {
        await ffmpeg.deleteFile(`frame${i}.png`);
      }
    }
    catch(e)
    {
      //finished
    }
    status = "Frame Preview";
  }
//#endregion

//#region image preview functions
var image_active = true;
var is_original = false;
var loading_image = false;
var submit_args = {};

async function loadImageFromIndexedDB(frameId) {
  try {
    is_original = false;
    const db = await openIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('frames', 'readonly');
      const framesStore = transaction.objectStore('frames');
      const request = framesStore.get(frameId);

      request.onerror = () => {
        reject(new Error('Error fetching frame data'));
      };

      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error('Frame not found'));
          return;
        }

        const frame_data = request.result.data;
        const blob = new Blob([frame_data], { type: 'image/png' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          update();
          var inputCanvas = new OffscreenCanvas(img.width, img.height);
          var ctx = inputCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var imageData = ctx.getImageData(0, 0, img.width, img.height);
          asciigen_worker.postMessage({setImage:true, args: submit_args, image:imageData.data.buffer, width: img.width, height: img.height}, [imageData.data.buffer])
          loading_image = true;
          image_active = true;
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };
        img.src = url;
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in loadImageFromIndexedDB:', error);
    throw error;
  }
}

async function loadFrame(frame)
{
  loaded_frame = frame;
  await loadImageFromIndexedDB(loaded_frame);
}

function resizeCanvas()
{
  try
  {
    if(asciigen_worker)
    {
      const bounding = canvas.getBoundingClientRect();
      asciigen_worker.postMessage({resizeCanvas:true, width: bounding.width, height:bounding.height});
    }
  }
  catch
  {

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

function download_image()
{
  asciigen_worker.postMessage({download: true});
}

var canvas = null;
var canvas_offscreen = null;
var asciigen_worker = null;

function fakeMountSetup()
{
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);

  canvas.imageSmoothingEnabled = false;
  canvas.style.imageRendering = 'crisp-edges'; 

  CanvasRenderingContext2D.prototype.clip = function () { };
  OffscreenCanvasRenderingContext2D.prototype.clip = function () { };

  asciigen_worker = new image_worker();
  asciigen_worker.onmessage = (e) =>
  {
    if(e.data.init)
    {
      webgpu_status = e.data.webgpu;
      loadFrame(1);
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
      document.body.appendChild(link);
      link.download = 'for_cherished_user.png';
      link.href = url;
      link.click();
      document.body.removeChild(link);
      return;
    }
  }

  canvas_offscreen = canvas.transferControlToOffscreen();
  const bounding = canvas.getBoundingClientRect();
  asciigen_worker.postMessage({init:true, video_type:true, canvas: canvas_offscreen, canvas_width: bounding.width, canvas_height:bounding.height}, [canvas_offscreen]);
}

function fakeMountClose()
{
  try
  {
    asciigen_worker.terminate();
    if (canvas) {
      resizeObserver.unobserve(canvas);
    }
  }
  catch
  {

  }
}

$: if (status === "Frame Preview" && canvas) {
    fakeMountSetup();
    setTimeout(() => {reloadImage();}, 750);
  }

onMount(()=>
{
  
}, async () =>
{
  fakeMountClose();
  const db = await openIndexedDB();
  const framesStore = db.transaction('frames', 'readwrite').objectStore('frames');
  await framesStore.clear();
})
//#endregion

//#region Options

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
      text_only: false,
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
//#endregion

//#region Canvas Movement
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

function zoomIn() {
  asciigen_worker.postMessage({ type: 'zoom', delta: 1.1, x: canvas.width / 2, y: canvas.height / 2 });
}

function zoomOut() {
  asciigen_worker.postMessage({ type: 'zoom', delta: 0.9, x: canvas.width / 2, y: canvas.height / 2 });
}

function reset() {
  asciigen_worker.postMessage({ type: 'reset' });
}
//#endregion

//#region WebGPU

var webgpu_status = false;
var webgpu_type = false;
function updateWebGPUStatus(value) {
  webgpu_type = value === 'webgpu';
  asciigen_worker.postMessage({ webgpu_set: true, webgpu_active: webgpu_type });
  reloadImage();
  //post message for change
}

//#endregion

function distributeFrames(threadCount, frameCount) {
    const framesPerThread = Math.ceil(frameCount / threadCount);
    const distribution = [];

    for (let i = 0; i < threadCount; i++) {
      const startFrame = i * framesPerThread + 1; // Adding 1 to start from index 1
      const endFrame = Math.min((i + 1) * framesPerThread, frameCount);
      distribution.push({ threadId: i, startFrame, endFrame });
    }

    return distribution;
  }

var total_compiled = 0; // Start from 0

async function export_video(audio) {
  const threads = 4; //4 is most smooth
  const frameDistribution = distributeFrames(threads, frameCount); // Use frameCount directly
  
  update();
  const threadPromises = frameDistribution.map(({ threadId, startFrame, endFrame }) => {
    // console.log("start: " + startFrame + " | end: " + endFrame);
    progress_data = `Converting frames to ASCII. Total: ${frameCount}.`;
    return new Promise((resolve) => {
      const v_worker = new video_worker();
      v_worker.postMessage({ startFrame: startFrame, endFrame: endFrame, args: submit_args });
      v_worker.onmessage = (e) => {
        if (e.data.frame_made) {
          total_compiled += 1;
          progress_data = `Frames Converted to ASCII: ${total_compiled}/${frameCount}. Please wait. Frames are processed in large batches.`;
          // console.log("updated: " + e.data.frame_number);
        }
        if (e.data.complete) {
          v_worker.terminate();
          resolve();
        }
      }
    });
  });
  status = "Exporting Video";
  await Promise.all(threadPromises);
  fakeMountClose();

  for (let i = 1; i <= frameCount; i++) {
      const data_ = await loadExportFromIndexedDB(i);
      await ffmpeg.writeFile(`frame${i}.png`, data_);
  }

  const db = await openIndexedDB();
  const framesStore = db.transaction('frames', 'readwrite').objectStore('frames');
  framesStore.clear();

  if(contains_audio && audio)
  {
    await ffmpeg.exec([
      '-framerate', fps.toString(),
      '-i', 'frame%d.png',
      '-i', 'audio.aac',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-shortest', //remove?
      'output.mp4'
    ]);
  }
  else
  {
    await ffmpeg.exec([
      '-framerate', fps.toString(),
      '-i', 'frame%d.png',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-shortest', //remove?
      'output.mp4'
    ]);
  }

  const outputData = new Uint8Array(await ffmpeg.readFile('output.mp4'));
  open_blob =  URL.createObjectURL(new Blob([outputData], { type: 'video/mp4' }));

  status = "Finished";
}

async function loadExportFromIndexedDB(frameId) {
  try {
    const db = await openIndexedDB();

    const imagedata = await new Promise((resolve, reject) => {
      const transaction = db.transaction('frames', 'readonly');
      const framesStore = transaction.objectStore('frames');
      const request = framesStore.get(frameId);

      request.onerror = () => {
        reject(new Error('Error fetching frame data'));
      };

      request.onsuccess = async () => {
        if (!request.result) {
          reject(new Error('Frame not found'));
          return;
        }

        const frame_data = request.result.data;
        
        resolve(frame_data);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });

    return imagedata;
  } catch (error) {
    console.error('Error in loadImageFromIndexedDB:', error);
    throw error;
  }
}

var open_blob;
var video_obj;
$: if (status === "Finished" && video_obj) {
  video_obj.src = open_blob;
  video_obj.play();
  ffmpeg.terminate();
}

function download_video()
{
  var link = document.createElement('a');
  document.body.appendChild(link);
  link.download = 'something.mp4';
  link.href = open_blob;
  link.click();
  document.body.removeChild(link);
  return;
}

async function frame_update()
{
  if(loaded_frame < 1)
  {
    loaded_frame = 1;
  }
  if(loaded_frame > frameCount)
  {
    loaded_frame = frameCount;
  }
  await loadImageFromIndexedDB(loaded_frame);
}

</script>

<svelte:document on:resize={resizeCanvas}/>

<div class="font-mono font-bold text-gray-800">
  <h1 class="text-center">{issues}</h1>
  {#if ffmpeg_loaded == "Loaded."}
    {#if status == "Drop"}
      <!-- Drop / open zone -->
      <div class="flex justify-center gap-5 px-5
      font-mono font-bold text-gray-800
      flex-col lg:flex-row">
        <div class="max-w-[1024px] lg:w-full h-[500px] rounded-lg outline-1 outline-dashed">
          <!-- svelte-ignore missing-declaration -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="w-full h-full flex flex-col justify-center items-center text-center gap-5 relative">
            <div class="w-full h-full absolute flex justify-center items-center flex-col gap-3  [&[drag=true]]:bg-blue-300 bg-white" style="z-index: 1000;"
              on:dragenter={(e) => {e.target.setAttribute('drag', true);}}
              on:dragexit={(e) => {e.target.setAttribute('drag', false);}}
              on:dragover={(e) => {e.preventDefault();}}
              on:drop={(e) => {onDrop(e); e.target.setAttribute('drag', false);}}
            >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                <p class="hover:cursor-pointer select-none hover:text-blue-600 active:text-blue-700" on:click={clickToLoad}>Drag your video into this panel<br>
                  or click here to open a video. Or paste your video (ctrl + v).</p>
            </div>
          </div> 
        </div>
      </div>
    {:else if status == "Extracting"}
      <h1 class="text-center">FPS: {fps}</h1>
      <h1 class="text-center">Status - {progress_data}</h1>
    {:else if status == "Frame Preview"}
      <!-- Current frame preview / cancel - frame 1 preview-->
      <div class="flex justify-center gap-5 px-5 mb-5
      font-mono font-bold text-gray-800
      flex-col lg:flex-row">
        <div class="max-w-[1024px] lg:w-full h-[500px] rounded-lg outline-1 outline-dashed">
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="w-full h-full flex flex-col justify-center items-center text-center gap-5 relative"
          >
            <div class="w-full h-full absolute"
              >
              <!-- Add click stuff for canvas -->
              {#if loading_image && image_active}
                <div class="absolute w-full h-full pointer-events-none" style="z-index: 1000;">
                  <div class="absolute top-0 left-0 bg-white text-red-400 p-2 m-2 rounded-lg">
                    Loading new image...
                  </div>
                </div>
              {/if}
              <canvas class="w-full h-full rounded-lg [&[drag=true]]:bg-blue-300" 
              bind:this={canvas} 
              on:dragenter={(e) => {e.target.setAttribute('drag', true);}}
              on:dragexit={(e) => {e.target.setAttribute('drag', false);}}
              on:dragover={(e) => {e.preventDefault();}}
              on:drop={(e) => {onDrop(e); e.target.setAttribute('drag', false);}}
              on:resize={resizeCanvas}
              on:mousedown={handleMouseDown}
              on:mousemove={handleMouseMove}
              on:mouseup={handleMouseUp}
              on:mouseleave={handleMouseUp}
              on:wheel={handleWheel}
              on:touchstart={handleTouchStart}
              on:touchmove={handleTouchMove}
              on:touchend={handleTouchEnd}
              ></canvas>
              {#if image_active}
              <div class="absolute right-0 top-0 flex justify-center gap-2 flex-wrap p-2">
                <!-- <button class=" hover:bg-gray-300 mt-1 mr-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75  active:bg-gray-400" style="z-index: 100;"
                on:mousedown={unloadImage}>X</button> -->
              </div>
                
                <div class="absolute right-0 bottom-0 flex justify-center gap-2 flex-wrap p-2">
                  <button class="-mt-1 p-1 px-2 rounded-lg opacity-75 select-none cursor-auto text-gray-400">Drag and move around</button>
                  {#if is_original}
                    <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={switchImageType}>ASCII</button>
                  {:else}
                    <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={switchImageType}>Original</button>
                  {/if}
                  
                  <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={download_image}>↓</button>
                  <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={zoomOut}>-</button>
                  <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={zoomIn}>+</button>
                  <button class="-mt-1 p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={reset}>Reset view</button>
                </div>
              {/if}
            </div>
          </div>
        </div>
        {#if image_active}
        <div class="lg:w-1/2 lg:max-w-[500px] md:w-full flex flex-col gap-2 md:h-[500px]">
          <div class="flex justify-center flex-col p-3 overflow-auto rounded-lg outline-1 outline-dashed">
            <div class="w-full h-full flex flex-col text-lg gap-2">
              <p class="text-center mt-2">Current Frame: {loaded_frame}/{frameCount}</p>
              <div class="flex justify-center flex-wrap items-center gap-2">
                <span>Frame: </span> 
                <input type="number" class="outline outline-1 p-1 rounded-lg w-[75px]" min="1" step="1" bind:value={loaded_frame} on:change={frame_update}/>
                <button class="p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={() => {loaded_frame -= 1; frame_update();}}>Back</button>
                <button class="p-2 px-3 bg-gray-200 rounded-lg opacity-75 hover:bg-gray-300 active:bg-gray-400" on:click={() => {loaded_frame += 1; frame_update();}}>Next</button>
              </div>
              <p class="text-center mt-2">Video Frame:</p>
              <!-- <label>
                <span>Name: </span> 
                <input type="text" class="w-full outline outline-1 p-1 rounded-lg"/>
              </label> -->
              <div class="flex justify-center flex-wrap gap-2">
                <button on:click={download_image} class="bg-green-200 hover:bg-green-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Download Frame</button>
              <button on:click={resetOptions} class="bg-yellow-200 hover:bg-yellow-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Reset Options</button>
              <!-- <button class="bg-gray-200 rounded-lg outline-1 outline-dashed w-[200px]">Share</button>
              <button class="bg-gray-200 rounded-lg outline-1 outline-dashed w-[200px]">Save to collections</button> -->
              <button on:click={reloadImage} class="bg-blue-200 hover:bg-blue-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Refresh Frame</button>
              <button on:click={() => {export_video(true);}} class="bg-orange-200 hover:bg-orange-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Export Video</button>
              <button on:click={() => {export_video(false);}} class="bg-pink-200 hover:bg-pink-100 rounded-lg outline-1 outline-dashed w-[200px] p-1">Export Video w/ No Audio</button>
              <!-- <button on:click={unloadImage} class="bg-red-200 rounded-lg outline-1 outline-dashed w-[200px] p-1">New image</button> -->
              </div>
              <p class="text-center mt-2">Options:</p>
              <!-- <label>
                <span>Text output: </span> 
                <input type="checkbox"/>
              </label> -->
              <label>
                <span>Image Colors: </span> 
                <input type="checkbox" bind:checked={color} on:change={update}/>
              </label>
              <label>
                <span>Invert: </span> 
                <input type="checkbox" bind:checked={invert} on:change={update}/>
              </label>
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
              <label>
                <span>Color: </span> 
                <input type="color" class="w-full outline outline-1 p-1 rounded-lg" bind:value={customColor} on:change={update}/>
              </label>
              <!-- <label>
                <span>Background Color Enabled: </span> 
                <input type="checkbox" bind:checked={backgroundColor_enabled} on:change={update}/>
              </label> -->
              <label>
                <span>Background Color: </span> 
                <input type="color" class="w-full outline outline-1 p-1 rounded-lg" bind:value={backgroundColor} on:change={update}/>
              </label>
              <label>
                <span>Background transparency: </span> 
                <input type="number" class="w-full outline outline-1 p-1 rounded-lg" min="0" step="0.01" bind:value={backgroundTransparency} on:change={update}/>
                <input type="range" class="w-full" min="0" max="1" step="0.01" bind:value={backgroundTransparency} on:change={update}/>
              </label>
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
              <label>
                <span>Characters (Smallest to Biggest):</span> 
                <textarea bind:value={customCharacters} on:input={update} class="outline outline-1 p-1 rounded-lg my-2 w-full"></textarea>
              </label>
              <!-- <p class="text-center mt-2">Advanced Options:</p>
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
    {:else if status == "Exporting Video"}
    <h1 class="text-center mb-2">Status - {progress_data}</h1>
    {:else if status == "Finished"}
    <div class="flex justify-center items-center flex-wrap flex-col gap-2">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video bind:this={video_obj} class="w-auto h-auto" controls={true}></video>
      <button on:click={download_video} class="bg-green-400 hover:bg-green-500 rounded-lg p-2 mb-2">Download!</button>
      <p class="text-center mb-2 font-mono font-bold text-gray-800">Refresh page to use video again. If nothing shows up in the video / download, the page has ran out of memory.</p>
    </div>
    
    {/if}
  {:else}
    <h1 class="text-center">{ffmpeg_loaded}</h1>
  {/if}
</div>