const postcss = require('postcss');
const plugin = require('./');

async function run (input, output, opts = { }) {
  let result = await postcss([plugin(opts)]).process(input, { from: undefined })
  expect(result.css).toEqual(output)
  expect(result.warnings()).toHaveLength(0)
}

/*
  NOTE: The tests with no opts provided are using the package.test.json file for the package.json
  See line 13 in the index.js file for more information
*/

it('rules already prefixed with the single-spa prefix are ignored', async () => {
  await run('#single-spa-application\\:\\@jet-oomta\\/order-list { };',
            '#single-spa-application\\:\\@jet-oomta\\/order-list { };',
            { framework: 'vue' });
});

it(':root is replaced with the prefix entirely', async () => {
  await run(':root { };',
            `#single-spa-application\\:\\@jet-oomta\\/order-list { };`,
             { framework: 'vue' });
})

it('"single-spa-prefix-ignore comment prefixed" rule is ignored', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            { framework: 'vue' });
});

it('rule prefixed with comment other than single-spa-prefix-ignore is prefixed', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */.c2 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */#single-spa-application\\:\\@jet-oomta\\/order-list .c2 { };',
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

 await run(input, '.c1 {}\n#single-spa-application\\:\\@jet-oomta\\/order-list .c2 {}', { framework: 'vue' });
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

  await run(input, '.c1 {}\n#single-spa-application\\:\\@jet-oomta\\/order-list .c2 {}', { framework: 'react', react: { scopeConfig: 'css-modules'} });
});
