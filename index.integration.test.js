const postcss = require('postcss');
const plugin = require('.');
const fs = require('fs');

process.env.NODE_ENV = 'production';

async function run (input, output, opts = { }) {
  let result = await postcss([plugin(opts)]).process(input, { from: undefined })
  expect(result.css).toEqual(output)
  expect(result.warnings()).toHaveLength(0)
}


it('Retreives appName from package.json if no appName opt provided', async () => {
    await run(
      'a { };',
      '#single-spa-application\\:postcss-single-spa-scoped a { };',
      { framework: 'vue' });
});

it('Throws error if no appName opt provided or package.json found', async () => {
    const tempFolderPath = `${process.cwd()}/temp`;

    // 1. Create temp folder
    fs.mkdirSync(tempFolderPath, { recursive: true }, () => {});

    // 2. Mock process.cwd() to temp folder
    // This simulates the root of a project with no package.json
    process.chdir(tempFolderPath);


    expect(() => postcss([plugin({ framework: 'vue' })]).process('a { };', { from: undefined })).toThrow(Error);

    // 3. Navigate back to root folder
    process.chdir(`${process.cwd()}/..`);

    // 4. Delete temp folder
    fs.rmdirSync(tempFolderPath, { }, () => {});

});
