'use strict';
const fs = require('fs');
//const path = require('path');
//const saveCompiledTest = require('../saveCompiledTest');

function customReporter(results, opts) {
  let passed = 0;
  let failed = 0;
  let passes = "";
  let fails = "";
  let offset = 1000;
  let sets = 0;
  const start = Date.now();

  results.on('pass', function (test) {
    passed++;
    --offset;
    if (offset === 0)
    {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        offset = 1000;
        ++sets;
        process.stdout.write(`Run ${1000 * sets} tests in ${Math.floor((Date.now() - start)/1000)}s with ${failed} failures`);
    }

    passes += test.file + "\n";
  });

  results.on('fail', function (test) {
    failed++;
    --offset;
    if (offset === 0)
    {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        offset = 1000;
        ++sets;
        process.stdout.write(`Run ${1000 * sets} tests in ${Math.floor((Date.now() - start)/1000)}s with ${failed} failures`);
    }

    fails += `FAIL ${test.file} (${test.scenario}) ${test.result.message}\n`;
  });

  results.on('end', function () {
    const stamp = Date.now();
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write("preparing output...");
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    fs.writeFile(`/Users/Richard/Documents/test262-harness/fails${stamp}.txt`, fails, function (err){if (err !== null) {console.log(err);}});
    fs.writeFile(`/Users/Richard/Documents/test262-harness/passes${stamp}.txt`, passes, function (err){if (err !== null) {console.log(err);}});
    console.log(`Ran ${(passed + failed)} tests in ${Math.floor((stamp - start)/1000)}s`);
    console.log(`passed ${passed} tests`);
    console.log(`failed ${failed} tests`);
  });
}

module.exports = customReporter;
