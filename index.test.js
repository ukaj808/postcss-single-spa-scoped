const postcss = require('postcss');
const plugin = require('./');

jest.mock('uuid');

async function run(input, output, opts = {}) {
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

it('rules already prefixed with the single-spa prefix are ignored and additional selectors are ignored', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name div { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div { display: flex; };',
    { additionalSelectors: ['#app', '#blahblah123'] });
});

it('selector list with one already prefixed selector correctly only prefixes the non-prefixed selector, and additional selectors are ignored for the prefixed selector', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name a, b { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name a, #single-spa-application\\:\\@org\\/app-name b, #app b, #blahblah123 b { display: flex; };',
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


it('Rule with descendant selector is prefixed correctly', async () => {
  await run('div a { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div a { display: flex; };');
});

it('Rule with multiple descendant selectors is prefixed correctly', async () => {
  await run('div a .c1 { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div a .c1 { display: flex; };');
});

it('Rule with different combinators is prefixed correctly', async () => {
  await run('div > a + .c1 { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div > a + .c1 { display: flex; };');
});

it('Rule with pseudo-element is prefixed correctly', async () => {
  await run('button::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name button::after { display: flex; };');
});

it('A rule with a list of selectors, each having a different combinator, is prefixed correctly', async () => {
  await run('div > a + .c1, div a .c2, div ~ .c3 { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div > a + .c1, #single-spa-application\\:\\@org\\/app-name div a .c2, #single-spa-application\\:\\@org\\/app-name div ~ .c3 { display: flex; };');
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

it('Additional :not pseudo-class contains the original selector (with combinators) without the prefix', async () => {
  await run('div > a + .c1 { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div > a + .c1:not([id^="single-spa-application\\:parcel"] div > a + .c1) { display: flex; };',
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

it('When ::before or ::after pseudo-elements are used on there own (implying all elements), simply prefix them with the single-spa prefix', async () => {
  await run('::before, ::after { display: flex; }',
    '#single-spa-application\\:\\@org\\/app-name ::before, #single-spa-application\\:\\@org\\/app-name ::after { display: flex; }');
});

it('When ::before or ::after pseudo-elements are used on a selector, prefix them with the single-spa prefix', async () => {
  await run('div::before, div::after { display: flex; }',
    '#single-spa-application\\:\\@org\\/app-name div::before, #single-spa-application\\:\\@org\\/app-name div::after { display: flex; }');
});

it('When ::before or ::after pseudo-elements are use on a selector with a combinator, prefix them with the single-spa prefix', async () => {
  await run('div > button > .c1::before, button + .c2::after { display: flex; }',
    '#single-spa-application\\:\\@org\\/app-name div > button > .c1::before, #single-spa-application\\:\\@org\\/app-name button + .c2::after { display: flex; }');
});

it('When ::before or ::after pseudo-elements are used are on there own (implying all elements), and exclude parcels is true, prefix with them with a * then splice in the excludeParcels pseudo class between the star and pseudo-element', async () => {
  await run('::before , ::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name *:not([id^="single-spa-application\\:parcel"] *)::before, #single-spa-application\\:\\@org\\/app-name *:not([id^="single-spa-application\\:parcel"] *)::after { display: flex; };',
    { excludeParcels: true });
});

it('When ::before or ::after pseudo-elements are used on a selector, and exclude parcels is true, splice in the excludeParcels pseudo class between the selector and the pseudo-element', async () => {
  await run('div::before , div::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::before, #single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::after { display: flex; };',
    { excludeParcels: true });
});

it('When ::before or ::after pseudo-elements are used on a selector, and exclude parcels is true, and additionalSelectors are provided, splice in the excludeParcels pseudo class between the selector and the pseudo-element and ignore the additional selectors', async () => {
  await run('div::before , div::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::before, #app div::before, .rando123 div::before, #single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::after, #app div::after, .rando123 div::after { display: flex; }',
    { excludeParcels: true, additionalSelectors: ['#app', '.rando123'] });
});

it('When ::before or ::after pseudo-elements are use on a selector with a combinator, and exclude parcels is true, splice in the excludeParcels pseudo class between the selector and the pseudo-element', async () => {
  await run('div > button > .c1::before, button + .c2::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div > button > .c1:not([id^="single-spa-application\\:parcel"] div > button > .c1)::before, #single-spa-application\\:\\@org\\/app-name button + .c2:not([id^="single-spa-application\\:parcel"] button + .c2)::after { display: flex; };',
    { excludeParcels: true });
});

it('When the selector is already prefixed and contains a ::before or ::after pseudo-element, and exclude parcels is true, splice in the excludeParcels pseudo class between the selector and the pseudo-element', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name div::before , #single-spa-application\\:\\@org\\/app-name div::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::before, #single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::after { display: flex; };',
    { excludeParcels: true });
});

it('When the selector is already prefixed and contains a ::before or ::after pseudo-element, and exclude parcels is true, and additionalSelectors are provided, splice in the excludeParcels pseudo class between the selector and the pseudo-element and ignore additional selectors because that doesnt make sense', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name div::before , #single-spa-application\\:\\@org\\/app-name div::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::before, #single-spa-application\\:\\@org\\/app-name div:not([id^="single-spa-application\\:parcel"] div)::after { display: flex; };',
    { excludeParcels: true, additionalSelectors: ['#app', '.rando123'] });
});

it('When ::before or ::after are used on there own (implying all elements) and are already prefixed and exclude parcels is true, prefix them with a * then splice in the excludeParcels pseudo class between the star and pseudo-element', async () => {
  await run('#single-spa-application\\:\\@org\\/app-name ::before , #single-spa-application\\:\\@org\\/app-name ::after { display: flex; };',
    '#single-spa-application\\:\\@org\\/app-name *:not([id^="single-spa-application\\:parcel"] *)::before, #single-spa-application\\:\\@org\\/app-name *:not([id^="single-spa-application\\:parcel"] *)::after { display: flex; };',
    { excludeParcels: true });
});

it('a single simple :root selector is replaced entirely with the single spa app id', async () => {
  await run(':root { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name { --main-bg-color: brown; }');
});

it('a single simple :root selector is transformed into a selector list with the app id and additional selectors when additionalSelectors provided', async () => {
  await run(':root { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name, #app, #blahblah123 { --main-bg-color: brown; }',
    { additionalSelectors: ['#app', '#blahblah123'] });
});

it('a single complex selector with :root in it only replaces the :root string with single spa app id', async () => {
  await run(':root > .c1 { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name > .c1 { --main-bg-color: brown; }');
});

it('a single complex selector with :root in it turns into a list of selectors, where the rule is duplicated (and changed) for every additional selector when additional selectors provided', async () => {
  await run(':root > .c1 { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name > .c1, #app > .c1, #blahblah123 > .c1 { --main-bg-color: brown; }',
    { additionalSelectors: ['#app', '#blahblah123'] });
});

it('a simple :root selector in a selector list is replaced the single spa app id', async () => {
  await run('button, :root { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name button, #single-spa-application\\:\\@org\\/app-name { --main-bg-color: brown; }');
});

it('a simple :root selector in a selector list is transformed into a list of selectors, with a selector for the app id and each additional selector', async () => {
  await run('button, :root { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name button, #app button, #blahblah123 button, #single-spa-application\\:\\@org\\/app-name, #app, #blahblah123 { --main-bg-color: brown; }',
    { additionalSelectors: ['#app', '#blahblah123'] });
});

it(':root with combinator with a combinator turns into a list of selectors where :root is replaced in each selector by first the single spa app id and then the additional selectors; inside an original list', async () => {
  await run('button, :root > .c1 { --main-bg-color: brown; };',
    '#single-spa-application\\:\\@org\\/app-name button, #app button, #blahblah123 button, #single-spa-application\\:\\@org\\/app-name > .c1, #app > .c1, #blahblah123 > .c1 { --main-bg-color: brown; }',
    { additionalSelectors: ['#app', '#blahblah123'] });
});

it('nested css rules are NOT prefixed', async () => {
  await run('div { a { display: flex; } }',
    '#single-spa-application\\:\\@org\\/app-name div { a { display: flex; } }');
});

it('nested css rules with & nesting selector are NOT prefixed', async () => {
  await run('div { &:hover { display: flex; } }',
    '#single-spa-application\\:\\@org\\/app-name div { &:hover { display: flex; } }');
});
