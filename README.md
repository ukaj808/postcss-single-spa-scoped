# postcss-single-spa-scoped

[PostCSS] plugin for manipulating the CSS in a single-spa application to best achieve scoped CSS.

[PostCSS]: https://github.com/postcss/postcss

```css
.foo {
  /* Input example */
}
```

```css
#single-spa-application\\:\\@org\\/app-name .foo {
  /* Output example */
}
```

## Why...
Typically in single page application frameworks (Vue, React, etc.), there is a stylesheet imported at the _global_ level.
```ts
// main.ts file
import './style.css';
```
These styles are not scoped to any component! This is typically a good thing as it allows you to share styles; but _global_ stylesheets are a problem when your application is nested inside a microfrontend architecture. Why is it a problem? Because typically "import './style.css'" is compiled by bundlers into javascript code which mounts that style sheet in the head element as a style tag.

That style you defined in your style.css file? _"h1 { font-size: 100px }"_.. It's now affecting the whole page!

This plugin attemps to counteract that by following the single-spa recomendation and prefixing all of your compiled css selectors with an id _"#single-spa-application//:..."_. This works (for the most part) because your application is nested inside a div that single-spa creates that has the aforementioned _fancy_ id.

![image](https://github.com/ukaj808/postcss-single-spa-scoped/assets/96708453/01c8dffa-7162-4a5e-9de5-a16b4d28ba5b)

**There's a catch**

Sometimes your application has _portals_ (html outside the body) like modals or popups. These will typically leave the boundary of the single-spa div. That global style you defined will now not effect that portal because your now prefixed selectors wont select it.

To address this we added a field, additionalSelectors, to our plugin options. We expect an array of strings that are valid css selectors. We will then scope each original selector to each of the additional selectors you've provided *along* with the single-spa-id scope.

For example, if your pass ["#my-dialog"], the output will be:

```css
#single-spa-application\:\@app1 .pointer-events-none,
#my-dialog .pointer-events-none {
	pointer-events: none
}
```

This will help you address the _portals_ issue! Give your portal an id and then add that id as an additional selector... now your portal will be selected.


## Usage

**Step 1:** Install plugin:

```sh
npm install --save-dev postcss-single-spa-scoped
```

**Step 2:** Add the plugin to your config:

### Vite

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import singleSpaScoped from 'postcss-single-spa-scoped';

export default defineConfig({
  plugins: [
    vue(),
  ],
  css: {
    postcss: {
      // Options.appName             -- Optional: (Uses package.json "name" by default)
      // Options.additionalSelectors -- Optional
      // Options.skipScopedStyles    -- Optional: (false by default)
      plugins: [singleSpaScoped()],
    }
  },
})
```

### Plugin Options Type Definitions

```ts
type PluginOpts = {
    appName?: string;
    skipScopedStyles?: SkipScopedStyles;
    additionalSelectors?: string[];
}

type SkipScopedStyles = false | VueSkipScopedStylesConfig | ReactSkipScopedStylesConfig | SvelteSkipScopedStylesConfig;

type VueSkipScopedStylesConfig = {
  framework: 'vue',
}

type ReactSkipScopedStylesConfig = {
  framework: 'react',
  scopeStrategy: 'css-modules'
}

type SvelteSkipScopedStylesConfig = {
  framework: 'svelte',
  tooling: 'vite'
}

```

