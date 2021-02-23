'use strict';
//const path = require('path');
//const saveCompiledTest = require('../saveCompiledTest');

function customReporter(results, opts) {
  let output = [];
  let tests = 0;
  let pass = 0;
  let fail = 0;
  let timeouts = 0;
  const start = Date.now();

  results.on('pass', function (test) {++pass;});

  results.on('fail', function (test) {++fail;});

  results.on('test end', function (test) {
    if (test.result.message == 'Test timed out') {
      ++timeouts;
    }
    output[tests] = {
        file : test.file,
        pass : test.result.pass ? true : false,
        msg : test.result.pass ? "" : test.result.message
    }
    ++tests;
    /*process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`run ${tests} tests`);*/
  });

  results.on('end', function () {
    const end = Date.now();
    //process.stdout.clearLine();
    //process.stdout.cursorTo(0);
    console.log(`Total timeouts ${timeouts}`);
    console.log(`preparing output, running ${tests} tests took ${Math.floor((end - start)/1000)}s`);
    console.log(`${fail} tests failed and ${pass} tests passed`);

    opts.whenDone(output);
  });
}

module.exports = customReporter;
