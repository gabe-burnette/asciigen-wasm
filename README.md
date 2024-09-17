<p align="center">
  <img src="/asciigen-site/static/og_display.png" alt="Asciigen-wasm Logo" width="175">
</p>

<h1 align="center">Asciigen-wasm</h1>

<p align="center">
  <strong>Transform images and video into ASCII art using WebAssembly and WebGPU</strong>
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#uses">Uses</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#sharing-api">Sharing API</a> •
  <a href="#credits">Credits</a>
</p>

---

> Asciigen-WASM is a zig-to-wasm implementation inspired by [@seatedro](https://x.com/seatedro)'s [Asciigen](https://github.com/seatedro/asciigen). The WebGPU version is still experimental.

## Key Features

- **Image Conversion**: Transform images into ASCII art with customizable options
- **Text Styling**: Convert images to ASCII text with adjustable size and brightness
- **Video Processing**: Convert videos to ASCII art videos
- **Camera Support**: Use your device's camera as an input source
- **Sharing**: Share your creations with others (images < 0.5MB)
- **Mobile Support**: Fully responsive with pinch and zoom functionality. FFmpeg WASM may crash due to page size limits.

## Uses

- Svelte
- WebAssembly (zig-to-wasm)
- WebGPU (experimental)
- Cloudflare Pages
- Cloudflare Turnstile (for sharing api)
- Web Workers
- Offscreen Canvas
- FFmpeg WASM
- Mediainfo.JS WASM

## Project Structure

The project is divided into three main components:

1. [**zig-to-wasm**](/asciigen-wasm): WebAssembly core functionality
2. [**Site**](/asciigen-site): Svelte-based frontend
3. [**Sharing API**](/asciigen-sharing-api): Backend for sharing functionality

## Getting Started

1. Clone the repository
2. Navigate to each component's directory for specific setup instructions
3. Deploy the site using Cloudflare Pages for a 100% free hosting solution

## Sharing API

- Free to use for original images < 0.5MB
- Images are re-rendered into ASCII on the user's device
- Utilizes free GCP credits, Bun + SQLite, and Cloudflare services
- If the server crashes, it crashes 🤷‍♂️

## Credits

Inspired by [@seatedro](https://x.com/seatedro)'s [Asciigen](https://github.com/seatedro/asciigen)

---

<p align="center">
  <a href="https://github.com/gabe-burnette/asciigen-wasm">GitHub</a> •
  <a href="https://twitter.com/gabe_burnette">Twitter</a>
</p>
