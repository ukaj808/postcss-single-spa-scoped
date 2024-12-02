const cssesc = require('css.escape');
const path = require('path');
const uuid = require('uuid');

/**
 * @typedef {Object} PluginOpts
 * @property {string} [appName]
 * @property {boolean} [excludeParcels]
 * @property {string[]} [additionalSelectors]
 */

/**
 * @type {import('postcss').PluginCreator}
 * @param {PluginOpts} opts
 */
module.exports = (opts) => {

  opts = opts || {};

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

  const keyframeSuffix = '-' + uuid.v4().substring(0, 8);

  const processed = Symbol('processed');

  return {
   postcssPlugin: 'postcss-single-spa-scoped',
   AtRule (atRule) {
      if (atRule[processed]) return;
      if (atRule.name === 'keyframes') {
        atRule.params = atRule.params + keyframeSuffix;
        atRule[processed] = true;
      }
   },
   Declaration (decl) {
      if (decl[processed]) return;
      if (decl.prop === 'animation-name') {
        decl.value = decl.value + keyframeSuffix;
        decl[processed] = true;
      }
   },
   Rule (rule) {


    // -1. Check if rule is a keyframes rule (AND DONT PREFIX!)
    // This list is subject to grow... I'm unsure of all the use cases.
    if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') {
      rule[processed] = true;
      return;
    }

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

    // SVELTE HACK
    if (rule.source && rule.source.input && rule.source.input.file) {
      const filePath = path.parse(rule.source.input.file);
      if (filePath.base && filePath.base.includes('.vite-preprocess.')) {
        rule[processed] = true;
        return;
      }
    }

    const additionalSelectorsProvided = opts.additionalSelectors && opts.additionalSelectors.length > 0;

    // sanitize additional selectors
    if (additionalSelectorsProvided) {
      opts.additionalSelectors = opts.additionalSelectors.filter(s => s !== null && s.length > 0).map(s => s.trim());
    }

    rule.selector = rule.selectors.reduce((resultSelector, selector, i) => {
      let suffix = i === rule.selectors.length - 1 ? '' : ', ';

      // 3. Check if selector is already prefixed
      if (selector.startsWith(prefix)) {
        if (opts.excludeParcels) {
          const selectorWithoutPrefix = selector.substring(prefix.length + 1); // +1 for the hierarchy space
          return resultSelector + (selector + `:not([id^="single-spa-application\\:parcel"] ${selectorWithoutPrefix})`) + suffix;
        }
        return resultSelector + selector + suffix;
      }


      // 4. Prefix selector
      return resultSelector + (prefix + ' ' + selector + (opts.excludeParcels ? `:not([id^="single-spa-application\\:parcel"] ${selector})` : '') +
        (additionalSelectorsProvided ? ', ' +  opts.additionalSelectors.map(s =>  `${s} ${selector}`).join(', ') : '')) + suffix;

    }, '');

    rule[processed] = true;

   },
  }
}

module.exports.postcss = true
