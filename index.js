const cssesc = require('cssesc');

/**
 * @type {import('postcss').PluginCreator}
 * @param {object} opts
 * @param {string} opts.appName
 */
module.exports = (opts = {
  appName: undefined,
}) => {

  let prefix = 'single-spa-application:';
  if (opts.appName && opts.appName.length > 0) {
    prefix += `${opts.appName}`;
  } else {
    let pjson;
    try {
      if (process.env.NODE_ENV === 'test') {
        pjson = { name: '@jet-oomta/order-list' } ;
      } else {
        pjson = require(`${process.cwd()}/package.json`);
      } 
    } catch (e) {} // catch file access errors
    if (!pjson || !pjson.name) throw new Error("Could not generate prefix. Please provide an appName in the options or ensure your project has a package.json with a name property.");
    prefix += `${pjson.name}`;
  }

  prefix = cssesc(`#${prefix}`);
  
  const processed = Symbol('processed');

  return {
   postcssPlugin: 'singleSpaScoped',
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

    // 2. Check if selector is already prefixed with the single-spa prefix
    if (rule.selector.startsWith(prefix)) {
      rule[processed] = true;
      return;
    }

    // 3. Check if :root selector, if it is; replace with prefix entirely
    if (rule.selector === ':root') {
      rule.selector = prefix;
      rule[processed] = true;
      return;
    }

    rule.selector = prefix + ' ' + rule.selector;
    rule[processed] = true;
   },
  }
}

module.exports.postcss = true