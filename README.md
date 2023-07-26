# postcss-single-spa-scoped

[PostCSS] plugin for manipulating the global CSS in a single-spa application to best achieve scoped CSS.

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

TODO


## Usage

**Step 1:** Install plugin:

```sh
npm install --save-dev postcss postcss-single-spa-scoped
```

**Step 2:** Check you project for existed PostCSS config: `postcss.config.js`
in the project root, `"postcss"` section in `package.json`
or `postcss` in bundle config.

If you do not use PostCSS, add it according to [official docs]
and set this plugin in settings.

**Step 3:** Add the plugin to plugins list:

```diff
module.exports = {
  plugins: [
+   require('postcss-single-spa-scoped'),
    require('autoprefixer')
  ]
}
```

[official docs]: https://github.com/postcss/postcss#usage
