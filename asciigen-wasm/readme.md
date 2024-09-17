# Asciigen WASM Image Generator

This repository contains a WebAssembly (WASM) module for generating ASCII art from images. The module provides functionality to process images and convert them into ASCII representations with various customization options.

## Installation

To use this module, include the WASM file in your project and load it using the WebAssembly API.

```javascript
let wasm = await WebAssembly.instantiate(wasmModule, {});
let exports = wasm.exports;
let memory = exports.memory;
```

## Initialization

Before processing images, initialize the module:

```javascript
await exports.init();
```

## Usage

### Setting up the Image

1. Prepare your image as a `Uint8Array` RGBA array.
2. Use a canvas to paint the image and obtain the `ImageData`.
3. Set the image in WASM memory:

```javascript
const imageLength = imageData.data.length;
const imagePTR = await exports.addToMemory(0, imageLength);
new Uint8Array(memory.buffer).set(imageData.data, imagePTR, imageLength);
exports.writeValue(0, imageData.width);
exports.writeValue(1, imageData.height);
await exports.initImage();
```

### Custom Characters (Optional)

To use custom characters for ASCII representation:

```javascript
var text = " .1234ABCD";
const ascii_length = text.length;
const asciiPTR = await exports.addToMemory(1, ascii_length);
for (let i = 0; i < ascii_length; i++) {
  new Uint8Array(exports.memory.buffer)[asciiPTR + i] = text.charCodeAt(i);
}
await exports.initCharacters(sort);
```

### Processing the Image

Process the image with various options:

```javascript
await exports.processImage(
  color, //bool
  invert_image, //bool 
  scale, //float
  edge_detection, //bool
  sigma1, //float
  sigma2, //float
  brightness, //float
  full_chars, //bool
  block_size, //int
  threshold, //bool
  custom_color, //bool
  r, //int (0-255)
  g, //int (0-255)
  b, //int (0-255)
  background_color, //bool
  bg_r, //int (0-255)
  bg_g, //int (0-255)
  bg_b, //int (0-255)
  bg_a //int (0-255)
);
```

### Retrieving the Result

After processing, retrieve the new image data:

```javascript
const new_width = exports.readValue(0);
const new_height = exports.readValue(1);
const new_PTR = exports.readValue(2);
const img = new ImageData(
  new Uint8ClampedArray(memory.buffer, new_PTR, new_width * new_height * 4),
  new_width,
  new_height
);
```

### Cleanup

Release resources after processing:

```javascript
await exports.releaseImage();
await exports.releaseAll(); // Optional, resets everything
```

## API Reference

- `init()`: Initialize the WASM module
- `addToMemory(type, length)`: Allocate memory for image or text
- `writeValue(index, value)`: Write a value to memory
- `initImage()`: Set up the image for processing
- `initCharacters(sort)`: Initialize custom characters
- `processImage(...)`: Process the image with various options
- `readValue(index)`: Read a value from memory
- `releaseImage()`: Release the processed image
- `releaseAll()`: Release all allocated resources
