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

const wasmUrl = "https://asciigen.pages.dev/asciigen.wasm";
const dbName = 'Asciigen_storage';
const storeName = 'asciigen_mod';
const currentVersion = '1.0.0';

async function resetAsciiGen(setIMG)
{
  if(asciigen)
  {

  }
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

async function imageDataToPNGArrayOffscreen(imageData) {
  return await new Promise((resolve) => {
      // Create an OffscreenCanvas
      const offscreenCanvas = new OffscreenCanvas(imageData.width, imageData.height);
      const ctx = offscreenCanvas.getContext('2d');

      // Draw ImageData onto the OffscreenCanvas
      ctx.putImageData(imageData, 0, 0);

      // Convert the canvas content to a PNG Blob
      offscreenCanvas.convertToBlob({ type: 'image/png' }).then((blob) => {
          // Convert the Blob to a Uint8Array
          const reader = new FileReader();
          reader.onloadend = () => {
              resolve(new Uint8Array(reader.result)); // Uint8Array for ffmpeg
          };
          reader.readAsArrayBuffer(blob);
      });
  });
}

async function processFramesInParallel(startFrame, endFrame) {

  for (let frameIndex = startFrame; frameIndex <= endFrame; frameIndex++) {

    var asciigen = new Asciigen();
    const wasmModule = await downloadAndStoreWasm(wasmUrl, dbName, storeName, currentVersion);
    var wasm = await WebAssembly.instantiate(wasmModule, {});
    asciigen.init(wasm, false);

    if (saved_args.custom_characters) {
      await asciigen.setText(saved_args.chars, saved_args.chars_sorted);
    }

    const imageData_ = await loadImageFromIndexedDB(frameIndex);

    await asciigen.setImagefromImageData(imageData_);
    await asciigen.processImage(saved_args);

    const img_data_1 = await asciigen.createdImage();

    const uArray = await imageDataToPNGArrayOffscreen(img_data_1);

    await updateFrame(frameIndex, uArray);
    asciigen = null;
    postMessage({ frame_made: true, frame_number: frameIndex });
  }

  setTimeout(() => {postMessage({ complete: true });}, 1000)
}

onmessage = async (e) => {
  OffscreenCanvasRenderingContext2D.prototype.clip = function () { };

  if (e.data.endFrame) {
    saved_args = e.data.args;
    
    const startFrame = e.data.startFrame;
    const endFrame = e.data.endFrame;

    processFramesInParallel(startFrame, endFrame);
  }
}

async function updateFrame(frameNumber, modifiedFrameData) {
  const db = await openIndexedDB();
  const framesStore = db.transaction('frames', 'readwrite').objectStore('frames');
  await framesStore.put({ id: frameNumber, data: modifiedFrameData });
}

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

async function loadImageFromIndexedDB(frameId) {
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
        const blob = new Blob([frame_data], { type: 'image/png' });
        
        try {
          const imageBitmap = await createImageBitmap(blob);
          const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
          const ctx = offscreenCanvas.getContext('2d');
          ctx.drawImage(imageBitmap, 0, 0);
          const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
          resolve(imageData);
        } catch (error) {
          reject(new Error('Failed to create ImageBitmap: ' + error.message));
        }
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