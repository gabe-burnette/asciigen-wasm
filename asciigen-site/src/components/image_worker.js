// import asciigen_wasm from '../components/asciigen.wasm?url'

let imageData_ = null;
let saved_args = null;

let outputCanvas = null;
let outputCtx = null;

let last_image = null;
let original_active = false;

var fontBitmapBuffer = null;
var asciiCharsBuffer = null;
var inputBuffer = null;

let adapter = null;
let device = null;
let webgpu = false;

let last_w = 0;
let last_h = 0;

let isLiveFeed = false;

var asciigen = null;
function Asciigen() {
  this.wasm = null; 
  this.exports = null;
  this.memory = null;
  this.processing_image = false;
  this.renderer = false; // 0 - wasm, 1-webgpu
  this.imageWidth = 0;
  this.imageHeight = 0;
  this.args = {
      color: false, //color
      invert_image: false, //invert image
      scale: 1,  //scale

      edge_detection: false, //edge detection
      sigma1: 0.5,  //sigma1
      sigma2: 1,     //sigma2

      brightness: 1,     //brightness
      full_chars: false, //fullchars
      block_size: 8,     //block size
      threshold: false, //threshold - only if edge detection
      custom_characters: false,
      chars: "",
      chars_sorted: false,

      custom_color: false,  //use custom color
      r: 0,     //r
      g: 255,   //g
      b: 0,     //b

      background_color: false, //use background color
      bg_r: 0,    //r
      bg_g: 0,    //g
      bg_b: 0,    //b
      bg_a: 0,  //a

      reuse: true, //reuses image (not one time) - keep created image data in memory for faster processing, automatically gets deleted if new image
  };
  this.setRenderer = async function(renderer)
  {
    this.renderer = renderer;
    if(renderer)
    {
      try
      {
        if (!navigator.gpu) {
          throw new Error("WebGPU not supported on this browser.");
        }
      
        if(!device)
        {
          adapter = await navigator.gpu.requestAdapter();
          if (!adapter) {
            throw new Error("No appropriate GPUAdapter found.");
          }
          device = await adapter.requestDevice();
        }
      }
      catch
      {

      }
    }
  }
  this.init = async function(webassembly, webgpu)
  {
    this.wasm = webassembly;
    this.exports = webassembly.exports;
    this.memory = this.exports.memory;
    if(webgpu)
    {
      this.renderer = true;
    }
    await this.exports.init();
  }
  this.setImagefromImageData = async function(imageData)
  {
    if(!this.renderer)
    {
      this.imageWidth = imageData.width;
      this.imageHeight = imageData.height;

      const imageLength = imageData.data.length;
      const imagePTR = await this.exports.addToMemory(0, imageLength);
      new Uint8Array(this.memory.buffer).set(imageData.data, imagePTR, imageLength);
      this.exports.writeValue(0, imageData.width);
      this.exports.writeValue(1, imageData.height);
      return await this.exports.initImage();
    }
    else
    {
      if(inputBuffer)
      {
        await inputBuffer.destroy();
      }
      this.imageWidth = imageData.width;
      this.imageHeight = imageData.height;
      const uint32Data = new Uint32Array(imageData.data.buffer);
      inputBuffer = await device.createBuffer({
        size: uint32Data.length * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      const mappedInputRange = new Uint32Array(inputBuffer.getMappedRange());
      mappedInputRange.set(uint32Data);
      await inputBuffer.unmap();
    }
  }
  this.setImagefromArray = async function(image, width, height)
  {
    if(this.renderer)
    {
      return;
    }
    this.imageWidth = width;
    this.imageHeight = height;
    //check if uint8 or uint32
    const imageData = new ImageData(new Uint8ClampedArray(image), width, height);
    const imageLength = imageData.data.length;
    const imagePTR = await this.exports.addToMemory(0, imageLength);
    new Uint8Array(this.memory.buffer).set(imageData.data, imagePTR, imageLength);
    this.exports.writeValue(0, imageData.width);
    this.exports.writeValue(1, imageData.height);
    await this.exports.initImage();
    return imageData;
  }
  this.setText = async function(text, sort = false)
  {
    if(webgpu)
    {
      this.setTextMain(text);
    }
    else
    {
      const ascii_length = text.length;
      const asciiPTR = await this.exports.addToMemory(1, ascii_length);
      for (let i = 0; i < ascii_length; i++) {
        new Uint8Array(this.exports.memory.buffer)[asciiPTR + i] = text.charCodeAt(i);
      }
      if(sort)
      {
        await this.exports.initCharacters(sort);
      }
    }
    return true;
  }
  this.releaseText = async function()
  {
    await this.exports.releaseText();
  }
  this.releaseImage = async function()
  {
    if(!this.renderer)
    {
      await this.exports.releaseImage();
    }
    else
    {
      this.webgpuImage = null;
    }
  }
  this.releaseAll = async function()
  {
    if(!this.renderer)
    {
      await this.exports.releaseAll();
    }
    else
    {
      this.webgpuImage = null;
    }
  }
  this.newWidthHeight = async function()
  {
    const new_width = this.exports.readValue(0);
    const new_height = this.exports.readValue(1);
    return {width: new_width, height:new_height};
  }
  this.imageArrayOnly = async function()
  {
    //no cleanup - experimental
    if(!this.renderer)
    {
      const new_width = this.exports.readValue(0);
      const new_height = this.exports.readValue(1);
      const new_PTR = this.exports.readValue(2);
      return new Uint8ClampedArray(this.memory.buffer, new_PTR, new_width * new_height * 4);
    }
    else
    {
      return this.webgpuImage;
    }
  }
  this.createdImage = async function()
  {
    if(!this.renderer)
    {
      if(saved_args.text_only)
      {
        const new_width = this.exports.readValue(0);
        const new_height = this.exports.readValue(1);
        const new_PTR = this.exports.readValue(2);
        return{
          data: new Uint8ClampedArray(this.memory.buffer, new_PTR, new_width * new_height),
          width: new_width,
          height: new_height
        }
      }
      else
      {
        const new_width = this.exports.readValue(0);
        const new_height = this.exports.readValue(1);
        const new_PTR = this.exports.readValue(2);
        const img = new ImageData(new Uint8ClampedArray(this.memory.buffer, new_PTR, new_width * new_height * 4), new_width, new_height);
        await this.exports.releaseImage();
        return img;
      }
    }
  }
  this.processImage = async function(args)
  {
    this.processing_image = true;
    var imageVal = null;
    if(!this.renderer)
    {
      //false - wasm
      this.exports.writeValue(0, this.imageWidth);
      this.exports.writeValue(1, this.imageHeight);
      await this.exports.processImage(
        args.color, //color
        args.invert_image, //invert image
        args.scale,  //scale
    
        args.edge_detection, //edge detection
        args.sigma1,  //sigma1
        args.sigma2,     //sigma2
    
        args.brightness,     //brightness
        args.full_chars, //fullchars
        args.block_size,     //block size
        args.threshold, //threshold - only if edge detection
    
        args.custom_color,  //use custom color
        args.r,     //r
        args.g,   //g
        args.b,     //b
    
        args.background_color, //use background color
        args.bg_r,    //r
        args.bg_g,    //g
        args.bg_b,    //b
        args.bg_a,  //a
        args.text_only,
      );
    }
    else
    {
      const args2 = {
        block_size: args.block_size,
    
        detect_edges: args.edge_detection ? 1 : 0, //bool as int
        sigma1: args.sigma1, //tmp fix?
        sigma2: args.sigma2,
        threshold_disabled: 0, //bool as int
    
        brightness_boost: args.brightness,
        color: args.color ? 1 : 0, //bool as int
        invert_color: args.invert_image ? 1 : 0, //bool as int
        custom_color: args.custom_color ? 1 : 0, //bool as int
        custom_colors: {r:args.r,g:args.g,b:args.b},
        background_color: args.background_color ? 1 : 0,
        background_colors: {r:args.bg_r,g:args.bg_g,b:args.bg_b,a:args.bg_a},
        text_only: args.text_only,
      }

      const out_w = Math.floor(Math.round(this.imageWidth * args.scale) / args.block_size) * args.block_size;
      const out_h = Math.floor(Math.round(this.imageHeight * args.scale) / args.block_size) * args.block_size;
      imageVal = await this.processImageGPU(out_w, out_h, args2);
    }
    
    this.processing_image = false;
    if(imageVal)
    {
      return imageVal;
    }
  }

  this.setTextMain = function(text)
  {
    var array = new Uint32Array((text.length + 1));
    array[0] = text.length;
    for (let i = 1; i < text.length + 1; i++) {
      let index = text[i - 1].charCodeAt(0);
      if(index)
      {
        array[i] = index;
      }
      else
      {
        array[0] -= 1;
      }
    }
    if(device)
    {
      if(asciiCharsBuffer)
      {
        try
        {
          asciiCharsBuffer.destroy();
        }
        catch
        {
  
        }
      }
      asciiCharsBuffer = device.createBuffer({
        size: array.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      const mappedRange = new Uint32Array(asciiCharsBuffer.getMappedRange());
      mappedRange.set(array);
      asciiCharsBuffer.unmap();
    }
  }

  this.processImageGPU = async function(newWidth, newHeight, args) {
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported on this browser.");
    }
  
    if(!device)
    {
      adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
      }
      device = await adapter.requestDevice();
    }
    
    if(!asciiCharsBuffer)
    {
      //setText(" .-:=+iltIcsv1x%7aejorzfnuCJT3*69LYpqy25SbdgFGOVXkPhmw48AQDEHKUZR@B#NW0M");
      this.setTextMain(" .:-=+*%@#");
      //setText("@");
    }
    if(!fontBitmapBuffer)
    {
      //font
      const fontBitmapData = new Uint8Array(
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x06, 0x5f, 0x5f, 0x06, 0x00, 0x00,
          0x00, 0x03, 0x03, 0x00, 0x03, 0x03, 0x00, 0x00,
          0x14, 0x7f, 0x7f, 0x14, 0x7f, 0x7f, 0x14, 0x00,
          0x24, 0x2e, 0x6b, 0x6b, 0x3a, 0x12, 0x00, 0x00,
          0x46, 0x66, 0x30, 0x18, 0x0c, 0x66, 0x62, 0x00,
          0x30, 0x7a, 0x4f, 0x5d, 0x37, 0x7a, 0x48, 0x00,
          0x04, 0x07, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x1c, 0x3e, 0x63, 0x41, 0x00, 0x00, 0x00,
          0x00, 0x41, 0x63, 0x3e, 0x1c, 0x00, 0x00, 0x00,
          0x08, 0x2a, 0x3e, 0x1c, 0x1c, 0x3e, 0x2a, 0x08,
          0x08, 0x08, 0x3e, 0x3e, 0x08, 0x08, 0x00, 0x00,
          0x00, 0x80, 0xe0, 0x60, 0x00, 0x00, 0x00, 0x00,
          0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x00, 0x00,
          0x00, 0x00, 0x60, 0x60, 0x00, 0x00, 0x00, 0x00,
          0x60, 0x30, 0x18, 0x0c, 0x06, 0x03, 0x01, 0x00,
          0x3e, 0x7f, 0x71, 0x59, 0x4d, 0x7f, 0x3e, 0x00,
          0x40, 0x42, 0x7f, 0x7f, 0x40, 0x40, 0x00, 0x00,
          0x62, 0x73, 0x59, 0x49, 0x6f, 0x66, 0x00, 0x00,
          0x22, 0x63, 0x49, 0x49, 0x7f, 0x36, 0x00, 0x00,
          0x18, 0x1c, 0x16, 0x53, 0x7f, 0x7f, 0x50, 0x00,
          0x27, 0x67, 0x45, 0x45, 0x7d, 0x39, 0x00, 0x00,
          0x3c, 0x7e, 0x4b, 0x49, 0x79, 0x30, 0x00, 0x00,
          0x03, 0x03, 0x71, 0x79, 0x0f, 0x07, 0x00, 0x00,
          0x36, 0x7f, 0x49, 0x49, 0x7f, 0x36, 0x00, 0x00,
          0x06, 0x4f, 0x49, 0x69, 0x3f, 0x1e, 0x00, 0x00,
          0x00, 0x00, 0x66, 0x66, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x80, 0xe6, 0x66, 0x00, 0x00, 0x00, 0x00,
          0x08, 0x1c, 0x36, 0x63, 0x41, 0x00, 0x00, 0x00,
          0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x00, 0x00,
          0x00, 0x41, 0x63, 0x36, 0x1c, 0x08, 0x00, 0x00,
          0x02, 0x03, 0x51, 0x59, 0x0f, 0x06, 0x00, 0x00,
          0x3e, 0x7f, 0x41, 0x5d, 0x5d, 0x1f, 0x1e, 0x00,
          0x7c, 0x7e, 0x13, 0x13, 0x7e, 0x7c, 0x00, 0x00,
          0x41, 0x7f, 0x7f, 0x49, 0x49, 0x7f, 0x36, 0x00,
          0x1c, 0x3e, 0x63, 0x41, 0x41, 0x63, 0x22, 0x00,
          0x41, 0x7f, 0x7f, 0x41, 0x63, 0x3e, 0x1c, 0x00,
          0x41, 0x7f, 0x7f, 0x49, 0x5d, 0x41, 0x63, 0x00,
          0x41, 0x7f, 0x7f, 0x49, 0x1d, 0x01, 0x03, 0x00,
          0x1c, 0x3e, 0x63, 0x41, 0x51, 0x73, 0x72, 0x00,
          0x7f, 0x7f, 0x08, 0x08, 0x7f, 0x7f, 0x00, 0x00,
          0x00, 0x41, 0x7f, 0x7f, 0x41, 0x00, 0x00, 0x00,
          0x30, 0x70, 0x40, 0x41, 0x7f, 0x3f, 0x01, 0x00,
          0x41, 0x7f, 0x7f, 0x08, 0x1c, 0x77, 0x63, 0x00,
          0x41, 0x7f, 0x7f, 0x41, 0x40, 0x60, 0x70, 0x00,
          0x7f, 0x7f, 0x0e, 0x1c, 0x0e, 0x7f, 0x7f, 0x00,
          0x7f, 0x7f, 0x06, 0x0c, 0x18, 0x7f, 0x7f, 0x00,
          0x1c, 0x3e, 0x63, 0x41, 0x63, 0x3e, 0x1c, 0x00,
          0x41, 0x7f, 0x7f, 0x49, 0x09, 0x0f, 0x06, 0x00,
          0x1e, 0x3f, 0x21, 0x71, 0x7f, 0x5e, 0x00, 0x00,
          0x41, 0x7f, 0x7f, 0x09, 0x19, 0x7f, 0x66, 0x00,
          0x26, 0x6f, 0x4d, 0x59, 0x73, 0x32, 0x00, 0x00,
          0x03, 0x41, 0x7f, 0x7f, 0x41, 0x03, 0x00, 0x00,
          0x7f, 0x7f, 0x40, 0x40, 0x7f, 0x7f, 0x00, 0x00,
          0x1f, 0x3f, 0x60, 0x60, 0x3f, 0x1f, 0x00, 0x00,
          0x7f, 0x7f, 0x30, 0x18, 0x30, 0x7f, 0x7f, 0x00,
          0x43, 0x67, 0x3c, 0x18, 0x3c, 0x67, 0x43, 0x00,
          0x07, 0x4f, 0x78, 0x78, 0x4f, 0x07, 0x00, 0x00,
          0x47, 0x63, 0x71, 0x59, 0x4d, 0x67, 0x73, 0x00,
          0x00, 0x7f, 0x7f, 0x41, 0x41, 0x00, 0x00, 0x00,
          0x01, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x00,
          0x00, 0x41, 0x41, 0x7f, 0x7f, 0x00, 0x00, 0x00,
          0x08, 0x0c, 0x06, 0x03, 0x06, 0x0c, 0x08, 0x00,
          0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
          0x00, 0x00, 0x03, 0x07, 0x04, 0x00, 0x00, 0x00,
          0x20, 0x74, 0x54, 0x54, 0x3c, 0x78, 0x40, 0x00,
          0x41, 0x7f, 0x3f, 0x48, 0x48, 0x78, 0x30, 0x00,
          0x38, 0x7c, 0x44, 0x44, 0x6c, 0x28, 0x00, 0x00,
          0x30, 0x78, 0x48, 0x49, 0x3f, 0x7f, 0x40, 0x00,
          0x38, 0x7c, 0x54, 0x54, 0x5c, 0x18, 0x00, 0x00,
          0x48, 0x7e, 0x7f, 0x49, 0x03, 0x02, 0x00, 0x00,
          0x98, 0xbc, 0xa4, 0xa4, 0xf8, 0x7c, 0x04, 0x00,
          0x41, 0x7f, 0x7f, 0x08, 0x04, 0x7c, 0x78, 0x00,
          0x00, 0x44, 0x7d, 0x7d, 0x40, 0x00, 0x00, 0x00,
          0x60, 0xe0, 0x80, 0x80, 0xfd, 0x7d, 0x00, 0x00,
          0x41, 0x7f, 0x7f, 0x10, 0x38, 0x6c, 0x44, 0x00,
          0x00, 0x41, 0x7f, 0x7f, 0x40, 0x00, 0x00, 0x00,
          0x7c, 0x7c, 0x18, 0x38, 0x1c, 0x7c, 0x78, 0x00,
          0x7c, 0x7c, 0x04, 0x04, 0x7c, 0x78, 0x00, 0x00,
          0x38, 0x7c, 0x44, 0x44, 0x7c, 0x38, 0x00, 0x00,
          0x84, 0xfc, 0xf8, 0xa4, 0x24, 0x3c, 0x18, 0x00,
          0x18, 0x3c, 0x24, 0xa4, 0xf8, 0xfc, 0x84, 0x00,
          0x44, 0x7c, 0x78, 0x4c, 0x04, 0x1c, 0x18, 0x00,
          0x48, 0x5c, 0x54, 0x54, 0x74, 0x24, 0x00, 0x00,
          0x00, 0x04, 0x3e, 0x7f, 0x44, 0x24, 0x00, 0x00,
          0x3c, 0x7c, 0x40, 0x40, 0x3c, 0x7c, 0x40, 0x00,
          0x1c, 0x3c, 0x60, 0x60, 0x3c, 0x1c, 0x00, 0x00,
          0x3c, 0x7c, 0x70, 0x38, 0x70, 0x7c, 0x3c, 0x00,
          0x44, 0x6c, 0x38, 0x10, 0x38, 0x6c, 0x44, 0x00,
          0x9c, 0xbc, 0xa0, 0xa0, 0xfc, 0x7c, 0x00, 0x00,
          0x4c, 0x64, 0x74, 0x5c, 0x4c, 0x64, 0x00, 0x00,
          0x08, 0x08, 0x3e, 0x77, 0x41, 0x41, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x77, 0x77, 0x00, 0x00, 0x00,
          0x41, 0x41, 0x77, 0x3e, 0x08, 0x08, 0x00, 0x00,
          0x02, 0x03, 0x01, 0x03, 0x02, 0x03, 0x01, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const uint32Array = new Uint32Array(fontBitmapData.buffer);
      fontBitmapBuffer = device.createBuffer({
        size: uint32Array.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      //device.queue.writeBuffer(fontBitmapBuffer, 0, uint32Array);
      // Get the mapped range and write the data directly
      const mappedRange = new Uint32Array(fontBitmapBuffer.getMappedRange());
      mappedRange.set(uint32Array);
  
      // Unmap the buffer to make it usable by the GPU
      fontBitmapBuffer.unmap();
    }

    const size = newWidth * newHeight * 4;
  
    var scaleBuffer = device.createBuffer({
      size: size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    var scalePipeline = createScaleBufferPipeline(device, inputBuffer, scaleBuffer, this.imageWidth, this.imageHeight, newWidth, newHeight);

    const output_size = size;
  
    var asciiBuffer = device.createBuffer({
      size: output_size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    var asciiPipeline = null;
  
    var edgeDetectionPipeline = null;
    var edgeBuffer = null;
  
    var filterPipeline = null;
    var magnitudeBuffer = null;
    var directionBuffer = null;
  
    if(args.detect_edges)
    {
      edgeBuffer = device.createBuffer({
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      magnitudeBuffer = device.createBuffer({
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      directionBuffer = device.createBuffer({
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      edgeDetectionPipeline = createDifferenceBufferPipeline(device, scaleBuffer, edgeBuffer, newWidth, newHeight, args.sigma1, args.sigma2);
      filterPipeline = createFilterBufferPipeline(device, edgeBuffer, magnitudeBuffer, directionBuffer, newWidth, newHeight);
      asciiPipeline = createAsciiBufferPipeline(device, scaleBuffer, asciiBuffer, newWidth, newHeight, args, magnitudeBuffer, directionBuffer);
    }
    else
    {
      magnitudeBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.STORAGE,
      });
      directionBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.STORAGE,
      });
      asciiPipeline = createAsciiBufferPipeline(device, scaleBuffer, asciiBuffer, newWidth, newHeight, args, magnitudeBuffer, directionBuffer);
    }
  
    // Create command encoder and pass
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
  
    const w_workgroup = Math.ceil(newWidth / 8);
    const h_workgroup = Math.ceil(newHeight / 8);
  
    passEncoder.setPipeline(scalePipeline.pipeline);
    passEncoder.setBindGroup(0, scalePipeline.bindGroup);
    passEncoder.dispatchWorkgroups(w_workgroup, h_workgroup);
  
    if(args.detect_edges)
    {
      passEncoder.setPipeline(edgeDetectionPipeline.pipeline);
      passEncoder.setBindGroup(0, edgeDetectionPipeline.bindGroup);
      passEncoder.dispatchWorkgroups(w_workgroup, h_workgroup);
  
      passEncoder.setPipeline(filterPipeline.pipeline);
      passEncoder.setBindGroup(0, filterPipeline.bindGroup);
      passEncoder.dispatchWorkgroups(w_workgroup, h_workgroup);
    }
  
    passEncoder.setPipeline(asciiPipeline.pipeline);
    passEncoder.setBindGroup(0, asciiPipeline.bindGroup);
    passEncoder.dispatchWorkgroups(w_workgroup, h_workgroup);
    
    passEncoder.end();
  
    // Get a GPU buffer for reading in an unmapped state
    const gpuReadBuffer = device.createBuffer({
      size: output_size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
  
    // Encode commands for copying buffer to buffer
    commandEncoder.copyBufferToBuffer(
      asciiBuffer /* source buffer */,
      0 /* source offset */,
      gpuReadBuffer /* destination buffer */,
      0 /* destination offset */,
      output_size /* size */
    );
  
    // Submit GPU commands
    const gpuCommands = commandEncoder.finish();
    await device.queue.submit([gpuCommands]);
  
    // Read buffer
    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = gpuReadBuffer.getMappedRange();
    const uint32A = new Uint32Array(arrayBuffer.slice(0)).buffer;
    const uint8Data = new Uint8ClampedArray(uint32A);
    await gpuReadBuffer.unmap();
  
    try
    {
      scaleBuffer.destroy();
      gpuReadBuffer.destroy();

      magnitudeBuffer.destroy();
      directionBuffer.destroy();
      if(args.detect_edges)
      {
        edgeDetectionPipeline = null;
        filterPipeline = null;
        scalePipeline = null;
      }
      else
      {
        asciiPipeline = null;
      }
    }
    catch
    {
  
    }

    if(args.text_only)
    {
      return uint8Data;
    }
    else
    {
      return new ImageData(uint8Data, newWidth, newHeight);
    }
  }
}

function createScaleBufferPipeline(device, inputBuffer, outputBuffer, width, height, newWidth, newHeight) {
  const shaderModule = device.createShaderModule({
    code: `
      @group(0) @binding(0) var<storage, read> input_buffer: array<u32>;
      @group(0) @binding(1) var<storage, read_write> output_buffer: array<u32>;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let new_width = u32(${newWidth});
          let new_height = u32(${newHeight});

          if (global_id.x >= new_width || global_id.y >= new_height) {
              return;
          }

          let x = global_id.x;
          let y = global_id.y;

          let width = u32(${width});
          let height = u32(${height});

          let src_x = u32(x * width / new_width);
          let src_y = u32(y * height / new_height);

          let index = src_y * width + src_x;
          let color = input_buffer[index];

          let output_index = y * new_width + x;
          output_buffer[output_index] = color;
      }
    `
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
    ],
  });

  return { pipeline, bindGroup };
}

function createDifferenceBufferPipeline(device, inputBuffer, outputBuffer, width, height, sigma1, sigma2) {
  const shaderModule = device.createShaderModule({
    code: `
      @group(0) @binding(0) var<storage, read> input_buffer: array<u32>;
      @group(0) @binding(1) var<storage, read_write> output_buffer: array<u32>;

      fn float4ToRgba(color: vec4<f32>) -> u32 {
          return (u32(color.r * 255.0) & 0xFF) |
                ((u32(color.g * 255.0) & 0xFF) << 8) |
                ((u32(color.b * 255.0) & 0xFF) << 16) |
                ((u32(color.a * 255.0) & 0xFF) << 24);
      }

      fn gaussian1(x: f32) -> f32 {
          let pi = 3.14159265359;
          return (1.0 / (sqrt(2.0 * pi) * f32(${sigma1}))) * exp(-(x * x) / (2.0 * f32(${sigma1}) * f32(${sigma1})));
      }
      
      fn createGaussianBlur1(x: u32, y:u32, half_kernel: i32) -> vec4<f32>
      {
        var blurred_color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        var weight_sum = 0.0;
        
        for (var i = -half_kernel; i <= half_kernel; i++) {
            for (var j = -half_kernel; j <= half_kernel; j++) {
                let sample_x = i32(x) + i;
                let sample_y = i32(y) + j;
                
                if (sample_x >= 0 && sample_x < i32(${width}) && sample_y >= 0 && sample_y < i32(${height})) {
                    let sample_index = u32(sample_y) * u32(${width}) + u32(sample_x);
                    let sample_color = getGrayscalePixel(sample_index);
                    let distance = sqrt(f32(i * i + j * j));
                    let weight = gaussian1(distance);
                    
                    blurred_color += sample_color * weight;
                    weight_sum += weight;
                }
            }
        }
        
        blurred_color /= weight_sum;
        return blurred_color;
      }

      fn gaussian2(x: f32) -> f32 {
          let pi = 3.14159265359;
          return (1.0 / (sqrt(2.0 * pi) * f32(${sigma2}))) * exp(-(x * x) / (2.0 * f32(${sigma2}) * f32(${sigma2})));
      }
      
      fn createGaussianBlur2(x: u32, y:u32, half_kernel: i32) -> vec4<f32>
      {
        var blurred_color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        var weight_sum = 0.0;
        
        for (var i = -half_kernel; i <= half_kernel; i++) {
            for (var j = -half_kernel; j <= half_kernel; j++) {
                let sample_x = i32(x) + i;
                let sample_y = i32(y) + j;
                
                if (sample_x >= 0 && sample_x < i32(${width}) && sample_y >= 0 && sample_y < i32(${height})) {
                    let sample_index = u32(sample_y) * u32(${width}) + u32(sample_x);
                    let sample_color = getGrayscalePixel(sample_index);
                    let distance = sqrt(f32(i * i + j * j));
                    let weight = gaussian2(distance);
                    
                    blurred_color += sample_color * weight;
                    weight_sum += weight;
                }
            }
        }
        
        blurred_color /= weight_sum;
        return blurred_color;
      }

      fn getGrayscalePixel(index: u32) -> vec4<f32>
      {
        let rgba = input_buffer[index];
        let r = f32(rgba & 0xFFu) / 255.0;
        let g = f32((rgba >> 8u) & 0xFFu) / 255.0;
        let b = f32((rgba >> 16u) & 0xFFu) / 255.0;
        let grayscale = (0.2126 * r + 0.7152 * g + 0.0722 * b);
        return vec4<f32>(grayscale, grayscale, grayscale, 1.0f);
      }

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let x = global_id.x;
          let y = global_id.y;

          if (x >= u32(${width}) || y >= u32(${height})) {
              return;
          }
          
          let index = y * u32(${width}) + x;
          let blurred1 = createGaussianBlur1(x, y, i32(${(Math.ceil(sigma1 * 3.0) * 2 + 1) / 2}));
          let blurred2 = createGaussianBlur2(x, y, i32(${(Math.ceil(sigma2 * 3.0) * 2 + 1) / 2}));

          var new_pixel: vec4<f32> = vec4<f32>(
              abs(blurred1.x - blurred2.x),
              abs(blurred1.y - blurred2.y),
              abs(blurred1.z - blurred2.z),
              abs(blurred1.w - blurred2.w)
          );

          new_pixel = clamp(new_pixel, vec4<f32>(0), vec4<f32>(1));

          output_buffer[index] = float4ToRgba(new_pixel);
      }
    `
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
    ],
  });

  return { pipeline, bindGroup };
}

function createFilterBufferPipeline(device, inputBuffer, magnitudeBuffer, directionBuffer, width, height)
{
  const shaderModule = device.createShaderModule({
    code: `
    @group(0) @binding(0) var<storage, read> input_buffer: array<u32>;
    @group(0) @binding(1) var<storage, read_write> magnitude: array<f32>;
    @group(0) @binding(2) var<storage, read_write> direction: array<f32>;

    const Gx = array<array<i32, 3>, 3>(
        array<i32, 3>(-1, 0, 1),
        array<i32, 3>(-2, 0, 2),
        array<i32, 3>(-1, 0, 1)
    );

    const Gy = array<array<i32, 3>, 3>(
        array<i32, 3>(-1, -2, -1),
        array<i32, 3>(0, 0, 0),
        array<i32, 3>(1, 2, 1)
    );

    fn get_pixel(w: u32, h: u32, x: i32, y: i32) -> vec3<f32> {
        let px = clamp(x, 0, i32(w) - 1);
        let py = clamp(y, 0, i32(h) - 1);
        let idx = u32(py) * w + u32(px);
        let pixel = input_buffer[idx];
        let r = f32((pixel >> 0u) & 0xFFu) / 255.0;
        let g = f32((pixel >> 8u) & 0xFFu) / 255.0;
        let b = f32((pixel >> 16u) & 0xFFu) / 255.0;
        return vec3<f32>(r, g, b);
    }

    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let width = ${width}u;
        let height = ${height}u;
        let x = global_id.x;
        let y = global_id.y;
        
        if (x >= width || y >= height) {
            return;
        }

        var gx: f32 = 0.0;
        var gy: f32 = 0.0;

        for (var ky: i32 = 0; ky < 3; ky++) {
            for (var kx: i32 = 0; kx < 3; kx++) {
                let px = i32(x) + kx - 1;
                let py = i32(y) + ky - 1;
                let pixel = get_pixel(width, height, px, py);
                let gray = dot(pixel, vec3<f32>(0.299, 0.587, 0.114));
                gx += gray * f32(Gx[ky][kx]);
                gy += gray * f32(Gy[ky][kx]);
            }
        }

        let idx = y * width + x;
        magnitude[idx] = sqrt(gx * gx + gy * gy);
        direction[idx] = atan2(gy, gx);
    }
    `
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: magnitudeBuffer }},
      { binding: 2, resource: { buffer: directionBuffer }}
    ],
  });

  return { pipeline, bindGroup };
}

function createAsciiBufferPipeline(device, inputBuffer, outputBuffer, width, height, args, magnitudeBuffer, directionBuffer) {
  const shaderModule = device.createShaderModule({
    code: `struct BlockInfo {
    sum_brightness: u32,
    sum_color: vec3<u32>,
    pixel_count: u32,
    sum_mag: f32,
    sum_dir: f32,
}

@group(0) @binding(0) var<storage, read> input_image: array<u32>;
@group(0) @binding(1) var<storage, read_write> output_image: array<u32>;
@group(0) @binding(2) var<storage, read> font_bitmap: array<u32>;
@group(0) @binding(3) var<storage, read> ascii_chars: array<u32>;

@group(0) @binding(4) var<storage, read> magnitude: array<f32>;
@group(0) @binding(5) var<storage, read> direction: array<f32>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let y = global_id.y * u32(${args.block_size});
    let x = global_id.x * u32(${args.block_size});

    // Ensure the thread is within bounds
    if (x >= u32(${width}) || y >= u32(${height})) {
        return;
    }

    // 1. Calculate block info
    let block_info = calculateBlockInfo(x, y);

    // 2. Select the appropriate ASCII character
    let ascii_char = selectAsciiChar(block_info);
    if(u32(${args.text_only}) != 0)
    {
      let idx = x * u32(${width}) + y;
      output_image[idx] = ascii_char;
    }
    else
    {
      // 3. Calculate the average color of the block
      let avg_color = calculateAverageColor(block_info);

      // 4. Convert the result into ASCII representation
      convertToAscii(x, y, ascii_char, avg_color);
    }
}

fn getPixel(characterIndex: u32, row: u32, column: u32) -> u32 {
    let uint32Index = characterIndex * 2u + row / 4u;
    let uint32Value = font_bitmap[uint32Index];
    let bitOffset = (row % 4u) * 8u + column;
    let pixelValue = (uint32Value >> bitOffset) & 1u;
    return pixelValue;
}

fn convertToAscii(x: u32, y: u32, char_index: u32, color_main: vec3<u32>) {
    if (char_index < 32u || char_index > 126u) {
        return;
    }

    let block_w = min(u32(${args.block_size}), u32(${width}) - x);
    let block_h = min(u32(${args.block_size}), u32(${height}) - y);

    for (var dy: u32 = 0u; dy < block_h; dy++) {
        for (var dx: u32 = 0u; dx < block_w; dx++) {
            let img_x = x + dx;
            let img_y = y + dy;
            if (img_x < u32(${width}) && img_y < u32(${height})) {
                let idx = (img_y * u32(${width}) + img_x);
                let color = select(
                        ${args.background_color != 0 ? `vec4<u32>(${args.background_colors.r}u, ${args.background_colors.g}u, ${args.background_colors.b}u, ${args.background_colors.a}u)` : args.invert_color ? `vec4<u32>(255u, 255u, 255u, 255u)` : `vec4<u32>(0u, 0u, 0u, 255u)`},
                        vec4<u32>(color_main.x, color_main.y, color_main.z, 255u),
                        getPixel(char_index, dx, dy) == 1u
                    );
                output_image[idx] = (255u << 24u) | (color.z << 16u) | (color.y << 8u) | color.x;
            }
        }
    }
}

fn calculateBlockInfo(x: u32, y: u32) -> BlockInfo {
    var info: BlockInfo;
    info.sum_brightness = 0u;
    info.pixel_count = 0u;
    info.sum_mag = 0.0;
    info.sum_dir = 0.0;

    let block_w = min(u32(${args.block_size}), u32(${width}) - x);
    let block_h = min(u32(${args.block_size}), u32(${height}) - y);

    for (var dy: u32 = 0u; dy < block_h; dy++) {
        for (var dx: u32 = 0u; dx < block_w; dx++) {
            let ix = x + dx;
            let iy = y + dy;
            if (ix >= u32(${width}) || iy >= u32(${height})) {
                continue;
            }
            let pixel_index = (iy * u32(${width}) + ix) * 1u;
            if (pixel_index + 2u >= u32(${width}) * u32(${height}) * 1u) {
                continue;
            }
            let r: u32 = (input_image[pixel_index] >> 0u) & 0xFFu;
            let g: u32 = (input_image[pixel_index] >> 8u) & 0xFFu;
            let b: u32 = (input_image[pixel_index] >> 16u) & 0xFFu;
            let gray: u32 = u32(f32(r) * 0.3 + f32(g) * 0.59 + f32(b) * 0.11);
            info.sum_brightness += gray;
            if (u32(${args.color}) != 0u) {
                info.sum_color.r += r;
                info.sum_color.g += g;
                info.sum_color.b += b;
            }
            if (u32(${args.detect_edges}) != 0u) {
                let edge_index = iy * u32(${width}) + ix;
                info.sum_mag += magnitude[edge_index];
                info.sum_dir += direction[edge_index];
            }
            info.pixel_count += 1u;
        }
    }

    return info;
}

fn selectAsciiChar(block_info: BlockInfo) -> u32 {
    let avg_brightness = block_info.sum_brightness / block_info.pixel_count;
    let boosted_brightness = round(f32(avg_brightness) * f32(${args.brightness_boost}));
    let clamped_brightness = clamp(u32(boosted_brightness), 0u, 255u);

    if (u32(${args.detect_edges}) != 0u) {
        let avg_mag: f32 = block_info.sum_mag / f32(block_info.pixel_count);
        let avg_dir: f32 = block_info.sum_dir / f32(block_info.pixel_count);
        let edge_char = getEdgeChar(avg_mag, avg_dir);
        if (edge_char != 0u) {
            return edge_char;
        }
    }

    if (clamped_brightness == 0u) {
        return 32u;
    } else {
        let stablize: f32 = f32(clamped_brightness) / 255f;
        let total: u32 = u32(ascii_chars[0]) - 1u;
        let total_characters: f32 = stablize * f32(total);
        let single_character: u32 = u32(round(total_characters));
        let clamp_character: u32 = clamp(single_character, 0u, total);
        return ascii_chars[clamp_character + 1u]; //length == 0, +1 for rest offset
    }
}

fn getEdgeChar(mag: f32, dir: f32) -> u32 {
    let angle = (dir + 3.14159265358979323846) * (180.0 / 3.14159265358979323846);
    let index = u32((angle + 22.5) % 180.0 / 45.0);
    
    if(u32(${args.threshold_disabled}) == 0u)
    {
      switch (index) {
        case 0u, 4u: { return 45u; } // '-'
        case 1u, 5u: { return 47u; } // '/'
        case 2u, 6u: { return 0u; } // '|' Space as a fallback 
        case 3u, 7u: { return 92u; } // '\'
        default: { return 124u; } // (ASCII value for vertical bar)
      }
    }
    else
    {
      switch (index) {
        case 0u, 4u: { return 45u; } // '-'
        case 1u, 5u: { return 47u; } // '/'
        case 2u, 6u: { return 124u; } // '|' Space as a fallback 
        case 3u, 7u: { return 92u; } // '\'
        default: { return 124u; } // (ASCII value for vertical bar)
      }
    }
}

  fn calculateAverageColor(block_info: BlockInfo) -> vec3<u32> {
    if (u32(${args.color}) != 0u) {
        if (u32(${args.custom_color}) != 0u) {
            var color = vec3<u32>(u32(${args.custom_colors.r}), u32(${args.custom_colors.g}), u32(${args.custom_colors.b}));
            if (u32(${args.invert_color}) != 0u) {
                color = vec3<u32>(255u) - color;
            }
            return color;
        } else {
            var color = vec3<u32>(
                block_info.sum_color.x / block_info.pixel_count,
                block_info.sum_color.y / block_info.pixel_count,
                block_info.sum_color.z / block_info.pixel_count
            );

            if (u32(${args.invert_color}) != 0u) {
                color = vec3<u32>(255u) - color;
            }
            return color;
        }
    } else {
        if (u32(${args.custom_color}) != 0u) {
            var color = vec3<u32>(u32(${args.custom_colors.r}), u32(${args.custom_colors.g}), u32(${args.custom_colors.b}));
            if (u32(${args.invert_color}) != 0u) {
                color = vec3<u32>(255u) - color;
            }
            return color;
        } else {
            if (u32(${args.invert_color}) != 0u) {
                return vec3<u32>(0u, 0u, 0u);
            } else {
                return vec3<u32>(255u, 255u, 255u);
            }
        }
    }
}
    `
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } }, //input image
      { binding: 1, resource: { buffer: outputBuffer } }, //output image

      { binding: 2, resource: { buffer: fontBitmapBuffer } }, //font_bitmap
      { binding: 3, resource: { buffer: asciiCharsBuffer } }, //ascii_characters

      { binding: 4, resource: { buffer: magnitudeBuffer } }, //ascii_characters
      { binding: 5, resource: { buffer: directionBuffer } }, //ascii_characters
    ],
  });

  return { pipeline, bindGroup };
}

async function checkForGPU()
{
  try{
    if (!navigator.gpu) {
      return false;
    }

    adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return false;
    }

    device = await adapter.requestDevice();
    return true;
  }
  catch
  {
    return false;
  }
}

onmessage = async (e) =>
{
  if(e.data.original_image)
  {
    postMessage({original_image_data:true, img_data: imageData_});
    return;
  }
  if(e.data.isLiveFeed)
  {
    isLiveFeed = true;
    return;
  }
  if(e.data.webgpu_set)
  {
    webgpu = e.data.webgpu_active;
    asciigen.setRenderer(webgpu);
    return;
  }
  if(e.data.init)
  {
    OffscreenCanvasRenderingContext2D.prototype.clip = function () { };
    asciigen = new Asciigen();
    const wasmModule = await downloadAndStoreWasm(wasmUrl, dbName, storeName, currentVersion);
    var wasm = await WebAssembly.instantiate(wasmModule, {});
    asciigen.init(wasm, false);

    outputCanvas = e.data.canvas;
    outputCtx = outputCanvas.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    // outputCanvas.style.imageRendering = 'crisp-edges'; 
    outputCanvas.width = e.data.canvas_width;
    outputCanvas.height = e.data.canvas_height;
    var webgpu_status = false;
    if(!e.data.video_type)
    {
      webgpu_status = await checkForGPU();
    }
    postMessage({init:true, webgpu: webgpu_status});
    return;
  }
  if(e.data.download)
  {
    if(original_active)
    {
      const canvas = new OffscreenCanvas(imageData_.width, imageData_.height);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(new ImageData(new Uint8ClampedArray(imageData_.data), imageData_.width, imageData_.height), 0, 0);
      const blob = await canvas.convertToBlob();
      const url = URL.createObjectURL(blob);
      postMessage({download:true, data:url});
    }
    else
    {
      const canvas = new OffscreenCanvas(last_image.width, last_image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(last_image, 0, 0);
      const blob = await canvas.convertToBlob();
      const url = URL.createObjectURL(blob);
      postMessage({download:true, data:url});
    }
  }
  if(e.data.setImage)
  {
    var total_reset = false;
    if(JSON.stringify(saved_args) != JSON.stringify(e.data.args))
    {
      total_reset = true;
    }
    saved_args = e.data.args;

    if(saved_args.is_original)
    {
      const imageWidth = e.data.width;
      const imageHeight = e.data.height;
      imageData_ = new ImageData(new Uint8ClampedArray(e.data.image), imageWidth, imageHeight);
      last_w = imageData_.width;
      last_w = imageData_.height;
      last_image = await createImageBitmap(imageData_);
      drawImage();
      postMessage({imageUpdated:true});
      if(isLiveFeed && total_reset)
        {
          reset(true);
        }
      return;
    }

    if(asciigen)
    {
      if(isLiveFeed)
      {
        imageData_ = null;
      }
      await resetAsciiGen();
    }

    if(!e.data.reloadImage)
    {
      const imageWidth = e.data.width;
      const imageHeight = e.data.height;
      imageData_ = new ImageData(new Uint8ClampedArray(e.data.image), imageWidth, imageHeight);
    }
    await asciigen.setImagefromImageData(imageData_);
    var possibleVal = null;
    if(saved_args.text_only)
    {
      possibleVal = await asciigen.processImage(saved_args);
      if(possibleVal)
      {
        postMessage({text:true, data: possibleVal})
      }
      else
      {
        const img_data_1 = await asciigen.createdImage();
        postMessage({text:true, data: img_data_1.data, width: img_data_1.width, height: img_data_1.height});
      }
    }
    else
    {
      possibleVal = await asciigen.processImage(saved_args);
      if(possibleVal)
      {
        last_w = possibleVal.width;
        last_w = possibleVal.height;
        last_image = await createImageBitmap(possibleVal);
        drawImage();
      }
      else
      {
        const img_data_1 = await asciigen.createdImage();
        last_w = img_data_1.width;
        last_w = img_data_1.height;
        last_image = await createImageBitmap(img_data_1);
        drawImage();
      }
      reset();
    }
    if(isLiveFeed && total_reset)
    {
      reset(true);
    }
    postMessage({imageUpdated:true});
    return;
  }
  if(e.data.unloadImage)
  {
    if(outputCtx)
    {
      outputCtx.clearRect(0, 0, canvas_width, canvas_height);
      imageData_ = null;
    }
    return;
  }
  if(e.data.useImage)
  {
    if(e.data.original)
    {
      original_active = true;
      last_image = await createImageBitmap(imageData_);
      drawImage();
      reset();
    }
    else
    {
      original_active = false;
      outputCtx.clearRect(0, 0, asciigen.imageWidth, asciigen.imageHeight);

      var possibleVal = null;
      possibleVal = await asciigen.processImage(saved_args);
      if(saved_args.text_only)
        {
          possibleVal = await asciigen.processImage(saved_args);
          if(possibleVal)
          {
            postMessage({text:true, data: possibleVal})
          }
          else
          {
            const img_data_1 = await asciigen.createdImage();
            postMessage({text:true, data: img_data_1.data, width: img_data_1.width, height: img_data_1.height});
          }
        }
        else
        {
          possibleVal = await asciigen.processImage(saved_args);
          if(possibleVal)
          {
            last_w = possibleVal.width;
            last_w = possibleVal.height;
            last_image = await createImageBitmap(possibleVal);
            drawImage();
          }
          else
          {
            const img_data_1 = await asciigen.createdImage();
            last_w = img_data_1.width;
            last_w = img_data_1.height;
            last_image = await createImageBitmap(img_data_1);
            drawImage();
          }
          reset();
        }
    }
    return;
  }
  if(e.data.createImage)
  {

    if(saved_args.custom_characters && !e.data.args.custom_characters)
    {
      saved_args = e.data.args;
      await resetAsciiGen(true);
    }

    if(!saved_args.custom_characters && e.data.args.custom_characters)
    {
      await asciigen.setText(saved_args.chars, saved_args.chars_sorted);
    }

    if(saved_args.custom_characters && e.data.args.custom_characters)
    {
      if(saved_args.chars != e.data.args.chars)
      {
        saved_args = e.data.args;
        await resetAsciiGen(true);
      }
      else
      {
        if(saved_args.chars_sorted != e.data.args.chars_sorted)
        {
          saved_args = e.data.args;
          await resetAsciiGen(true);
        }
      }
    }

    saved_args = e.data.args;

    if(asciigen.processing_image) return;
    var possibleVal = null;
    if(saved_args.text_only)
    {
      possibleVal = await asciigen.processImage(saved_args);
      if(possibleVal)
      {
        postMessage({text:true, data: possibleVal})
      }
      else
      {
        const img_data_1 = await asciigen.createdImage();
        postMessage({text:true, data: img_data_1.data, width: img_data_1.width, height: img_data_1.height});
      }
    }
    else
    {
      possibleVal = await asciigen.processImage(saved_args);
      if(possibleVal)
      {
        last_w = possibleVal.width;
        last_w = possibleVal.height;
        last_image = await createImageBitmap(possibleVal);
        drawImage();
      }
      else
      {
        const img_data_1 = await asciigen.createdImage();
        last_w = img_data_1.width;
        last_w = img_data_1.height;
        last_image = await createImageBitmap(img_data_1);
        drawImage();
      }
      reset();
    }
    postMessage({imageUpdated:true});
    return;
  }
  if(e.data.resizeCanvas)
  {
    canvas_width = e.data.width;
    canvas_height = e.data.height;

    if(outputCanvas)
    {
      offsetX *= (canvas_width / outputCanvas.width);
      offsetY *= (canvas_height / outputCanvas.height);

      outputCanvas.width = canvas_width;
      outputCanvas.height = canvas_height;

      if(asciigen && last_image)
      {
        drawImage();
      }
    }
    return;
  }

  const { type } = e.data;
  switch (type) {
      case 'init':
        canvas = e.data.canvas;
        ctx = canvas.getContext('2d');
        break;
      case 'pan':
        pan(e.data.deltaX, e.data.deltaY);
        break;
      case 'zoom':
        zoom(e.data.delta, e.data.x, e.data.y);
        break;
      case 'reset':
        reset(true);
        break;
    }
  }

async function resetAsciiGen(setIMG)
{
  asciigen = new Asciigen();
  const wasmModule = await downloadAndStoreWasm(wasmUrl, dbName, storeName, currentVersion);
  var wasm = await WebAssembly.instantiate(wasmModule, {});
  asciigen.init(wasm, webgpu);
  if(saved_args.custom_characters)
  {
    await asciigen.setText(saved_args.chars, saved_args.chars_sorted);
  }
  if(setIMG)
  {
    await asciigen.setImagefromImageData(imageData_);
  }
}

let canvas_width = 0;
let canvas_height = 0;

let scale_ = 1;
let offsetX = 0;
let offsetY = 0;

function drawImage() {
  outputCtx.clearRect(0, 0, canvas_width, canvas_height);
  outputCtx.save();

  try
  {
    outputCtx.mozImageSmoothingEnabled = false;
    outputCtx.webkitImageSmoothingEnabled = false;
    outputCtx.msImageSmoothingEnabled = false;
    outputCtx.imageSmoothingEnabled = false;
  }
  catch
  {

  }

  outputCtx.translate(offsetX, offsetY);
  outputCtx.scale(scale_, scale_);

  if(last_image)
  {
    outputCtx.drawImage(last_image, 0, 0);
  }

  outputCtx.restore();
  updateView();
}

function pan(deltaX, deltaY) {
  offsetX += deltaX;
  offsetY += deltaY;
  drawImage();
}

function zoom(delta, x, y) {
  const oldScale = scale_;
  scale_ *= delta;
  scale_ = Math.max(0.1, Math.min(scale_, 10));

  const scaleRatio = scale_ / oldScale;
  offsetX = x - (x - offsetX) * scaleRatio;
  offsetY = y - (y - offsetY) * scaleRatio;

  drawImage();
}

function reset(overrideForCamera) {
  if(isLiveFeed)
  {
    if(overrideForCamera)
    {
      //for camera?
    }
    else
    {
      return;
    }
  }
  const scaleX = canvas_width / last_image.width;
  const scaleY = canvas_height / last_image.height;
  scale_ = Math.min(scaleX, scaleY);

  // Calculate offsets to center the image
  offsetX = (canvas_width - last_image.width * scale_) / 2;
  offsetY = (canvas_height - last_image.height * scale_) / 2;
  drawImage();
}

function updateView() {
  postMessage({ type: 'updateView', scale_, offsetX, offsetY });
}

// const wasmUrl = asciigen_wasm;
const wasmUrl = "https://asciigen.pages.dev/asciigen.wasm";
const dbName = 'Asciigen_storage';
const storeName = 'asciigen_mod';
const currentVersion = '1.0.0';

//store and load ffmpeg wasm

// Function to download and store Wasm in IndexedDB with version checking
async function downloadAndStoreWasm(wasmUrl, dbName, storeName, currentVersion) {
  const db = await openDatabase(dbName, storeName);
  
  // Check if we have a stored version
  const storedWasm = await getStoredWasm(db, storeName);
  
  if (storedWasm && storedWasm.version === currentVersion) {
    return await WebAssembly.compile(storedWasm.bytes);
  }
  
  // If not stored or outdated, download the new version
  const response = await fetch(wasmUrl);
  const wasmBytes = await response.arrayBuffer();
  
  // Compile the module
  const wasmModule = await WebAssembly.compile(wasmBytes);
  
  // Store the new version
  await storeWasm(db, storeName, wasmBytes, currentVersion);
  
  return wasmModule;
}

// Helper function to open the IndexedDB database
function openDatabase(dbName, storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(storeName);
    };
  });
}

// Helper function to get stored Wasm from IndexedDB
function getStoredWasm(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get('currentWasm');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Helper function to store Wasm in IndexedDB
function storeWasm(db, storeName, wasmBytes, version) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({ bytes: wasmBytes, version: version }, 'currentWasm');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

