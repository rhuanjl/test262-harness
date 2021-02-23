// Copyright (C) 2014, Microsoft Corporation. All rights reserved.
// This code is governed by the BSD License found in the LICENSE file.
const DEFAULT_TEST_TIMEOUT = 10000;
const ACCEPTED_TEST262_VERSIONS = /^[1-3]\./

const fs = require('fs');
const path = require('path');

const Rx = require('rx');

const agentPool = require('../lib/agentPool.js');
const test262Finder = require('../lib/findTest262.js');
const testStream = require('../lib/test-stream');
const resultsEmitter = require('../lib/resultsEmitter.js');
const validator = require('../lib/validator.js');


function runner (argv)
{
    // test262 directory (used to locate includes unless overridden with includesDir)
    let test262Dir = argv.test262Dir;
    // where to load includes from (usually a subdirectory of test262dir)
    let includesDir;// = argv.includesDir;

    let tempDir = argv.tempDir;
    let acceptVersion = ACCEPTED_TEST262_VERSIONS;


    // initialize reporter by attempting to load lib/reporters/${reporter}
    // defaults to 'simple'
    let reporter;
    let reporterOpts = {};
    if (fs.existsSync(path.join(__dirname, '../lib/reporters', `${argv.reporter}.js`))) {
        reporter = require(`../lib/reporters/${argv.reporter}.js`);
    } else {
        console.error(`Reporter ${argv.reporter} not found.`);
        process.exitCode = 1;
        return;
    }

    if (argv.reporterKeys) {
        if (argv.reporter !== 'json') {
            console.error('`--reporter-keys` option applies only to the `json` reporter.');
            process.exitCode = 1;
            return;
        }

        reporterOpts.reporterKeys = argv.reporterKeys.split(',');
    }

    reporterOpts.whenDone = argv.whenDone;

    // Using argv.saveOnlyFailed implies argv.saveCompiledTests
    if (argv.saveOnlyFailed && !argv.saveCompiledTests) {
        argv.saveCompiledTests = true;
    }

    if (argv.saveCompiledTests) {
        reporterOpts.saveCompiledTests = argv.saveCompiledTests;
        if (argv.saveOnlyFailed) {
            reporterOpts.saveOnlyFailed = argv.saveOnlyFailed;
        }
    }

    // load preload contents
    let preludeContents = '';
    if (argv.prelude) {
        if (!Array.isArray(argv.prelude)) {
            argv.prelude = [argv.prelude];
        }
        preludeContents = argv.prelude.map(prelude => fs.readFileSync(prelude, 'utf8')).join('\n');
    }

    // Select hostType and hostPath. hostType defaults to 'node'.
    // If using default hostType, hostPath defaults to the current node executable location.
    let hostType;
    let hostPath;
    let features;

    if (argv.hostType) {
        hostType = argv.hostType;

        if (!argv.hostPath) {
            console.error('Missing host path. Pass --hostPath with a path to the host executable you want to test.');
            process.exitCode = 1;
            return;
        }

        hostPath = argv.hostPath;
    } else {
        hostType = 'node';

        if (argv.hostPath) {
            hostPath = argv.hostPath;
        } else {
            hostPath = process.execPath;
        }
    }

    if (hostType) {
        reporterOpts.hostType = hostType;
    }

    argv.timeout = argv.timeout || DEFAULT_TEST_TIMEOUT;
    let transpiler;
   /* if (argv.babelPresets) {
        let babel = require('babel-core');

        // https://github.com/bterlson/test262-harness/issues/87
        let presets = argv.babelPresets.split(",").map(bp => {
            if (!bp.startsWith('babel-preset-')) {
                bp = `babel-preset-${bp}`;
            }
            // babel's option manager will look for presets relative to the current
            // working directory, but we can give it absolute paths to start with
            // and that ensure that it looks in the right place (relative to where
            // test262-harness is installed)
            return path.resolve(__dirname, '../node_modules/', bp);
        });

        transpiler = code => babel.transform(code, { presets }).code;
    }*/

    if (argv.features) {
        features = argv.features.split(',').map(feature => feature.trim());
    }

    // Test Pipeline
    const pool = agentPool(Number(argv.threads), hostType, argv.hostArgs, hostPath,
                        { tempDir, timeout: argv.timeout, transpiler });

    if (!test262Dir) {
        test262Dir = test262Finder(argv._[0]);
    }
    reporterOpts.test262Dir = test262Dir;
    /*const remove = path.relative(process.cwd(), test262Dir);
    argv._ = argv._.map(p => path.relative(remove, p));*/


    const tests = testStream(test262Dir, includesDir, acceptVersion, argv._)
        .map(insertPrelude)
        .filter(hasFeatures);
    const pairs = Rx.Observable.zip(pool, tests);
    const rawResults = pairs.flatMap(pool.runTest).tapOnCompleted(() => pool.destroy());
    const results = rawResults.map(test => {
        test.result = validator(test);
        return test;
    });
    const resultEmitter = resultsEmitter(results);
    reporter(resultEmitter, reporterOpts);

    function insertPrelude(test) {
        const index = test.insertionIndex;
        if (index === -1) {
            return test;
        }

        if (preludeContents) {
            test.contents = test.contents.slice(0, index) +
            preludeContents +
            test.contents.slice(index);
        }

        return test;
    }

    function hasFeatures(test) {
        if (!features) {
            return true;
        }
        return features.filter(feature => (test.attrs.features || []).includes(feature)).length > 0;
    }
}

module.exports = runner;