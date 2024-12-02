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
            '#single-spa-application\\:\\@org\\/app-name { };');
});

it('"single-spa-prefix-ignore comment prefixed" rule is ignored', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { };');
});

it('rule prefixed with comment other than single-spa-prefix-ignore is prefixed', async () => {
  await run('/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */.c2 { };',
            '/* single-spa-prefix-ignore */\na { }; /* single-spa-prefix-ignore */.c1 { }; /* this class is nice! */#single-spa-application\\:\\@org\\/app-name .c2 { };');
});

it('plugin options appName is used as the prefix', async () => {
  await run('a { };',
            '#single-spa-application\\:my-app a { };',
            { appName: 'my-app' });
});

it('Prefix with additional selectors ontop of single-spa prefix, if additional selectors provided', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #app a, #blahblah123 a { display: flex; };',
            { additionalSelectors: ['#app', '#blahblah123'] });
});

it('Filter out empty string additinal selectors', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #app a { display: flex; };',
            { additionalSelectors: ['#app', ''] });
});

it('Empty additionalSelectors works the same as not providing additionalSelectors', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a { display: flex; };',
            { additionalSelectors: [] });
});


it('Grouped selectors are prefixed correctly, before each individual selector', async () => {
  await run('a, b, c { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #single-spa-application\\:\\@org\\/app-name b, #single-spa-application\\:\\@org\\/app-name c { display: flex; };');

});

it('grouped selectors are prefixed correctly, before each individual selector, with additional selectors', async () => {
  await run('a, b, c { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a, #app a, #blahblah123 a, #single-spa-application\\:\\@org\\/app-name b, #app b, #blahblah123 b, #single-spa-application\\:\\@org\\/app-name c, #app c, #blahblah123 c { display: flex; };',
            { additionalSelectors: ['#app', '#blahblah123'] });
});

it('Keyframe names are suffixed and keyframe offset selectors are not prefixed', async () => {
  await run('@keyframes mymove { from { top: 0px; } to { top: 200px; } }',
            '@keyframes mymove-b8f36a64 { from { top: 0px; } to { top: 200px; } }');
});

it('Keyframes and all references are suffixed with the first chunk of a uid', async () => {
  await run('@keyframes mymove { from { top: 0px; } to { top: 200px; } }; .c1 { animation-name: mymove; }',
            '@keyframes mymove-b8f36a64 { from { top: 0px; } to { top: 200px; } }; #single-spa-application\\:\\@org\\/app-name .c1 { animation-name: mymove-b8f36a64; }');
});

it('Additional :not pseudo-class suffixed to selectors to exclude styling of parcels', async () => {
  await run('a { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a:not([id^="single-spa-application\\:parcel"] a) { display: flex; };',
    { excludeParcels: true });
});

it('Additional :not pseudo-class contains the original selector (with hierarchy) without the prefix', async () => {
  await run('div a .c1 { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div a .c1:not([id^="single-spa-application\\:parcel"] div a .c1) { display: flex; };',
    { excludeParcels: true });
});

it('Rules already prefixed with the single-spa-prefix have there original selector suffixed with the exclude parcel pseudo class', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name a .b { display: flex; };',
            '#single-spa-application\\:\\@org\\/app-name a .b:not([id^="single-spa-application\\:parcel"] a .b) { display: flex; };',
    { excludeParcels: true });
});

it('Additional selectors are not suffixed with the excludeParcels pseudo class when excludeParcels is true', async () => {
  await run('button { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name button:not([id^="single-spa-application\\:parcel"] button), #app button, .rando123 button { display: flex; };',
    { additionalSelectors: ['#app', '.rando123'], excludeParcels: true });
});

it('grouped selectors are suffixed correctly with the excludeParcels pseudo class when exlcudeParcels is true', async () => {
  await run('.a, .b, .c { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name .a:not([id^="single-spa-application\\:parcel"] .a), #single-spa-application\\:\\@org\\/app-name .b:not([id^="single-spa-application\\:parcel"] .b), #single-spa-application\\:\\@org\\/app-name .c:not([id^="single-spa-application\\:parcel"] .c) { display: flex; };',
    { excludeParcels: true });
});

it('grouped selectors are suffixed correctly with the excludeParcels pseudo class and additional selectors are untouched', async () => {
  await run('a, b, c { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name a:not([id^="single-spa-application\\:parcel"] a), #app a, .rando123 a, #single-spa-application\\:\\@org\\/app-name b:not([id^="single-spa-application\\:parcel"] b), #app b, .rando123 b, #single-spa-application\\:\\@org\\/app-name c:not([id^="single-spa-application\\:parcel"] c), #app c, .rando123 c { display: flex; };',
    { additionalSelectors: ['#app', '.rando123'], excludeParcels: true });
});
