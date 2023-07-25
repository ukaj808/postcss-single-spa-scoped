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
  await run('#single-spa-application:@jet-oomta/order-list { };',
            '#single-spa-application:@jet-oomta/order-list { };',
            { });
});

it(':root is replaced with the prefix entirely', async () => {
  await run(':root { };', 
            `#single-spa-application:@jet-oomta/order-list { };`,
             { });
})

it('"single-spa-prefix-ignore comment prefixed" rule is ignored', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            { });
});

it('rule prefixed with comment other than single-spa-prefix-ignore is prefixed', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */.c2 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */#single-spa-application:@jet-oomta/order-list .c2 { };',
            { });
});

it('plugin options appName is used as the prefix', async () => {
  await run('a { };', 
            '#single-spa-application:my-app a { };',
            { appName: 'my-app' });
});
