const postcss = require('postcss');
const plugin = require('.');
const fs = require('fs');

process.env.NODE_ENV = 'production';

async function run (input, output, opts = { }, expectedErrorMessage = undefined) {

  if (expectedErrorMessage) {
    try {
      await postcss([plugin(opts)]).process(input, { from: undefined })
    } catch (e) {
      expect(e.message).toEqual(expectedErrorMessage);
    }
  }

  let result = await postcss([plugin(opts)]).process(input, { from: undefined })
  expect(result.css).toEqual(output)
  expect(result.warnings()).toHaveLength(0)
}


it('Retreives appName from package.json if no appName opt provided', async () => {
    await run(
      'a { };',
      '#single-spa-application:postcss-single-spa-scoped a { };',
      { });
});

it('Throws error if no appName opt provided or package.json found', async () => {
  const tempFolderPath = `${process.cwd()}/temp`;

  try {
    // 1. Create temp folder
    await fs.mkdirSync(tempFolderPath, { recursive: true }, (err) => {});

    // 2. Mock process.cwd() to temp folder
    // This simulates the root of a project with no package.json
    await process.chdir(tempFolderPath);


    await run(
      '#single-spa-application:my-app { };',
      '#single-spa-application:my-app { };',
      { appName: 'my-app' },
      "Could not generate prefix. Please provide an appName in the options or ensure your project has a package.json with a name property."
    );
  } finally {
    // 3. Navigate back to root folder
    await process.chdir(`${process.cwd()}/..`);

    // 4. Delete temp folder
    await fs.rmdirSync(tempFolderPath, { }, (err) => {});
  }

});
