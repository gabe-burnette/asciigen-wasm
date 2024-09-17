import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/** @type {import('vite').Plugin} */
const viteServerConfig = {
	name: 'log-request-middleware',
	configureServer(server) {
			server.middlewares.use((req, res, next) => {
					res.setHeader("Access-Control-Allow-Origin", "*");
					res.setHeader("Access-Control-Allow-Methods", "*");
					res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
					res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
					next();
			});
	}
};

export default defineConfig({
	plugins: [sveltekit(), viteServerConfig],
	optimizeDeps: {
		exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
	},
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
});

// export default defineConfig({
// 	plugins: [sveltekit()],
// });
