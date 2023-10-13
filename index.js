const cssesc = require('css.escape');
const path = require('path');

/**
 * @type {import('postcss').PluginCreator}
 * @param {object} opts
 * @param {string} opts.appName
 * @param {string} opts.framework
 * @param {object} opts.react
 * @param {string} opts.react.scopeConfig
 * @param {string[]}  opts.additionalSelectors
 */
module.exports = (opts = {
  appName: undefined,
  framework: undefined,
}) => {
  if (!opts.framework) throw new Error('framework.name is required (react or vue)');
  if (opts.framework !== 'react' && opts.framework !== 'vue') throw new Error('Only supports react or vue');
  if (opts.framework === 'react' && (!opts.react || !opts.react.scopeConfig)) throw new Error('Must provide opts.react when using react framework');

  let prefix = 'single-spa-application:';
  if (opts.appName && opts.appName.length > 0) {
    prefix += `${opts.appName}`;
  } else {
    let pjson;
    try {
      if (process.env.NODE_ENV === 'test') {
        pjson = { name: '@org/app-name' } ;
      } else {
        pjson = require(`${process.cwd()}/package.json`);
      }
      // eslint-disable-next-line no-empty
    } catch (e) { } // catch file access errors

    if (!pjson || !pjson.name) {
      throw new Error("Could not generate prefix. Please provide an appName in the options or ensure your project has a package.json with a name property.");
    }

    prefix += `${pjson.name}`;
  }

  prefix = `#${cssesc(prefix)}`;

  const processed = Symbol('processed');

  return {
   postcssPlugin: 'postcss-single-spa-scoped',
   Rule (rule) {
    // 0. Check if rule has already been processed
    if (rule[processed]) return;

    // 1. Check if rule has a comment above it to ignore
    if (rule.prev() && rule.prev().type === 'comment') {
      const comment = rule.prev();
      if (comment.text === 'single-spa-prefix-ignore') {
        rule[processed] = true;
        return;
      }
    }

    // 2. Check if style is already scoped, based on the framework
    if (rule.source && rule.source.input && rule.source.input.file) {
      const filePath = path.parse(rule.source.input.file);
      if (opts.framework === 'vue') {
        if (filePath.base && filePath.base.includes('&scoped=')) {
          rule[processed] = true;
          return;
        }
      } else if (opts.framework === 'react') {
        if (opts.react.scopeConfig === 'css-modules') {
          if (filePath.base.endsWith('.module.css')) {
            rule[processed] = true;
            return;
          }
        }
      }
    }

    // 3. Check if selector is already prefixed with the single-spa prefix
    if (rule.selector.startsWith(prefix)) {
      rule[processed] = true;
      return;
    }

    // 3. Check if :root selector, if it is; replace with prefix and additonal selectors entirely
    if (rule.selector === ':root') {
      rule.selector = prefix + (opts.additionalSelectors ? ', ' +  opts.additionalSelectors.join(', ') : '');
      rule[processed] = true;
      return;
    }

    rule.selector = prefix + ' ' + rule.selector +
        (opts.additionalSelectors ? ', ' +  opts.additionalSelectors.map(s =>  `${s} ${rule.selector}`).join(', ') : '');
    rule[processed] = true;
   },
  }
}

module.exports.postcss = true
