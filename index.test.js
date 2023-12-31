const postcss = require('postcss');
const plugin = require('./');

jest.mock('uuid');

async function run (input, output, opts = { }) {
  let result = await postcss([plugin(opts)]).process(input, { from: undefined })
  expect(result.css).toMatch(output)
  expect(result.warnings()).toHaveLength(0)
}

/*
  NOTE: The tests with no opts provided are using the package.test.json file for the package.json
  See line 13 in the index.js file for more information
*/

it('rules already prefixed with the single-spa prefix are ignored', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name { };',
            '#single-spa-application\\:\\@org\\/app-name { };',
            { framework: 'vue' });
});

it(':root is replaced with the prefix entirely', async () => {
  await run(':root { };',
            `#single-spa-application\\:\\@org\\/app-name { };`,
             { framework: 'vue' });
})

it(':root is replaced with the prefix entirely and additional selectors if provided', async () => {
  await run(':root { };',
            `#single-spa-application\\:\\@org\\/app-name, #app, #blahblah123 { };`,
             { framework: 'vue', additionalSelectors: ['#app', '#blahblah123'] });
})

it('"single-spa-prefix-ignore comment prefixed" rule is ignored', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            { framework: 'vue' });
});

it('rule prefixed with comment other than single-spa-prefix-ignore is prefixed', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */.c2 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */#single-spa-application\\:\\@org\\/app-name .c2 { };',
            { framework: 'vue' });
});

it('plugin options appName is used as the prefix', async () => {
  await run('a { };',
            '#single-spa-application\\:my-app a { };',
            { appName: 'my-app', framework: 'vue' });
});

it('Plugin throws error when framework.name is not provided', async () => {
  await expect(run('a { };', '', { appName: 'my-app' })).rejects.toThrow(Error);
})

it('The framework.name is vue; an already scoped rule is ignored', async () => {

 const scopedRule = new postcss.Rule({
    selector: '.c1',
 });

 const globalRule = new postcss.Rule({
    selector: '.c2',
  });

 scopedRule.source = {
    input: {
      file: 'file:///Users/username/projects/my-app/src/App.vue?vue&type=style&index=0&scoped=58aba71c&lang.cs',
    },
  };

  globalRule.source = {
    input: {
      file: 'file:///Users/username/projects/my-app/src/style.css',
    },
  };

 const input = new postcss.Root({
  nodes: [scopedRule, globalRule],
 });

 await run(input, '.c1 {}\n#single-spa-application\\:\\@org\\/app-name .c2 {}', { framework: 'vue' });
});

it('The framework.name is react; an already scoped rule is ignored', async () => {
  const scopedRule = new postcss.Rule({
    selector: '.c1',
  });

  const globalRule = new postcss.Rule({
    selector: '.c2',
  });

  scopedRule.source = {
    input: {
      file: 'file:///Users/username/projects/my-app/src/style.module.css',
    },
  };

  globalRule.source = {
    input: {
      file: 'file:///Users/username/projects/my-app/src/style.css',
    },
  };

  const input = new postcss.Root({
    nodes: [scopedRule, globalRule],
  });

  await run(input, '.c1 {}\n#single-spa-application\\:\\@org\\/app-name .c2 {}', { framework: 'react', react: { scopeConfig: 'css-modules'} });
});

it('Prefix with additional selectors ontop of single-spa prefix, if additional selectors provided', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #app a, #blahblah123 a { display: flex; };',
            { framework: 'vue', additionalSelectors: ['#app', '#blahblah123'] });
});

it('Filter out empty string additinal selectors', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #app a { display: flex; };',
            { framework: 'vue', additionalSelectors: ['#app', ''] });
});

it('Empty additionalSelectors works the same as not providing additionalSelectors', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a { display: flex; };',
            { framework: 'vue', additionalSelectors: [] });
});


it('Grouped selectors are prefixed correctly, before each individual selector', async () => {
  await run('a, b, c { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #single-spa-application\\:\\@org\\/app-name b, #single-spa-application\\:\\@org\\/app-name c { display: flex; };',
            { framework: 'vue' });

});

it('grouped selectors are prefixed correctly, before each individual selector, with additional selectors', async () => {
  await run('a, b, c { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #app a, #blahblah123 a, #single-spa-application\\:\\@org\\/app-name b, #app b, #blahblah123 b, #single-spa-application\\:\\@org\\/app-name c, #app c, #blahblah123 c { display: flex; };',
            { framework: 'vue', additionalSelectors: ['#app', '#blahblah123'] });
});

it('Keyframe names are suffixed and keyframe offset selectors are not prefixed', async () => {
  await run('@keyframes mymove { from { top: 0px; } to { top: 200px; } }',
            '@keyframes mymove-b8f36a64 { from { top: 0px; } to { top: 200px; } }',
            { framework: 'vue' });
});

it('Keyframes and all references are suffixed with the first chunk of a uid', async () => {
  await run('@keyframes mymove { from { top: 0px; } to { top: 200px; } }; .c1 { animation-name: mymove; }',
            '@keyframes mymove-b8f36a64 { from { top: 0px; } to { top: 200px; } }; #single-spa-application\\:\\@org\\/app-name .c1 { animation-name: mymove-b8f36a64; }',
            { framework: 'vue' });
});
