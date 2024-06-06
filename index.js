const cssesc = require('css.escape');
const path = require('path');
const uuid = require('uuid');

/**
 * @type {import('postcss').PluginCreator}
 * @param {object} opts
 * @param {string} opts.appName
 * @param {boolean | VueScopeConfig | ReactScopeConfig | SvelteScopeConfig} opts.skipScopedStyles // default: true
 * @param {string[]}  opts.additionalSelectors
 */
module.exports = (opts) => {


  // set default options
  opts = opts || {};
  if (opts.skipScopedStyles === undefined) {
    opts.skipScopedStyles = false;
  }

  // validate skipScopedStyles config
  if (typeof opts.skipScopedStyles === 'boolean' && opts.skipScopedStyles) {
    throw new Error('Invalid skipScopedStyles value: skipScopedStyles must be true or a framework configuration object');
  }
  if (typeof opts.skipScopedStyles !== 'boolean') {
    // validate that the skipScopedStyles is a correct framework config
    if (opts.skipScopedStyles.framework !== 'vue' && opts.skipScopedStyles.framework !== 'react' && opts.skipScopedStyles.framework !== 'svelte') {
      throw new Error('Invalid skipScopedStyles value: skipScopedStyles must be a boolean or a framework configuration object');
    }
    // if the framework is react, validate the scopeConfig
    if (opts.skipScopedStyles.framework === 'react') {
      if (opts.skipScopedStyles.scopeStrategy !== 'css-modules') {
        throw new Error('Invalid skipScopedStyles value: scopeStrategy must be defined as "css-modules" for react applications');
      }
    }

    // if the framework is svelte, validate the scopeConfig
    if (opts.skipScopedStyles.framework === 'svelte') {
      if (opts.skipScopedStyles.tooling !== 'vite') {
        throw new Error('Invalid skipScopedStyles value: The tooling value must be defined as "vite" for svelte applications. Only supports vite as of now.');
      }
    }
  }

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

    // 2. If user wants to skip already scoped styles, check if the rule is scoped by the framework

    if (typeof opts.skipScopedStyles === 'object') {
      if (opts.skipScopedStyles.framework === 'vue') {
        if (rule.source && rule.source.input && rule.source.input.file) {
          const filePath = path.parse(rule.source.input.file);
          if (filePath.base && filePath.base.includes('&scoped=')) {
            rule[processed] = true;
            return;
          }
        }
      } else if (opts.skipScopedStyles.framework === 'react') {
        if (opts.skipScopedStyles.scopeStrategy === 'css-modules') {
          if (rule.source && rule.source.input && rule.source.input.file) {
            const filePath = path.parse(rule.source.input.file);
            if (filePath.base.endsWith('.module.css')) {
              rule[processed] = true;
              return;
            }
          }
        }
      } else if (opts.skipScopedStyles.framework === 'svelte') {
          // if selector contains string ".svelte-"
          if (rule.source && rule.source.input && rule.source.input.file) {
            const filePath = path.parse(rule.source.input.file, rule.selectors);
            if (filePath.base && filePath.base.includes('.vite-preprocess.')) {
              rule[processed] = true;
              return;
            }
            if (rule.selector.includes('.svelte-')) {
              rule[processed] = true;
              return;
            }
         }
      }
    }

    const additionalSelectorsProvided = opts.additionalSelectors && opts.additionalSelectors.length > 0;

    // sanitize additional selectors
    if (additionalSelectorsProvided) {
      opts.additionalSelectors = opts.additionalSelectors.filter(s => s !== null && s.length > 0).map(s => s.trim());
    }

    rule.selector = rule.selectors.reduce((resultSelector, selector, i) => {
      const suffix = i === rule.selectors.length - 1 ? '' : ', ';
      // 3. Check if selector is already prefixed
      if (selector.startsWith(prefix)) {
        return resultSelector + selector + suffix;
      }


      // 4. Check if selector is :root then replace entirely
      if (selector === ':root') {
        return resultSelector + (prefix + (additionalSelectorsProvided ? ', ' +  opts.additionalSelectors.join(', ') : '')) + suffix;
      }
      // 5. Prefix selector
      return resultSelector + (prefix + ' ' + selector +
        (additionalSelectorsProvided ? ', ' +  opts.additionalSelectors.map(s =>  `${s} ${selector}`).join(', ') : '')) + suffix;

    }, '');

    rule[processed] = true;

   },
  }
}

module.exports.postcss = true
