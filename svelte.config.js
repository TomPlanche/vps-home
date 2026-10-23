import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // A Node server rather than a static site: the server sits on the private
    // network of the services and talks to them, the browser only talks to it.
    adapter: adapter()
  }
};

export default config;
