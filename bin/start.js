#!/usr/bin/env node
"use strict";
const run = require ('./run copy');

const fs = require ("fs");

const CREATE = true;
const detailed = true;

const args = {
    test262Dir: '', // put path to test262 here
    tempDir: "",
    reporter: 'checker',
    saveOnlyFailed : false,
    saveCompiledTests : false,
    prelude : false,
    hostType : 'ch',
    hostPath : '', // put path to ch here
    timeout : 6000,
    babelPresets : false,
    features : "",
    threads : 1,
    hostArgs : [],//["-ES6RegExPrototypeProperties", "-ES6RegExSymbols"],
    whenDone : handleResults,
    _ : [ // put comma seperated list of paths to tests to run here (can use * wildcards to run folders etc.)
    ]
};


console.log(`Running test262 tests with ${args.threads} threads`);
run(args);

function handleResults(results)
{
    const start = Date.now();
    const failed = {};
    const passed = {};
    const baseline = CREATE === false ? 
        fs.readFileSync("/Users/Richard/Documents/test262-harness/results/baseline.txt", 'utf8').split(",") : [];
    let fails = 0;
    let passes = 0;
    let output = "";
    const numResults = results.length;
    let current = failed;

    for (let j = 0; j < numResults; ++j)
    {
        const element = results[j];
        const file = element.file;
        const inBaseline = baseline.includes(file);
        const pass = element.pass;

        if ((pass && inBaseline) || (!pass && !inBaseline))
        {
            if (pass)
            {
                current = passed;
                ++passes;
            }
            else
            {
                current = failed;
                ++fails;
            }
            const splits = file.split("/");
            const len = splits.length - 1;
            let i = 3;
            for (; i < len; ++i)
            {
                current = hasOrAdd(current, splits[i] + "_");
            }
            if (CREATE === true)
            {
                output += element.file + ",";
            }
            Array.prototype.push.call(current, splits[i] + " " + element.msg);
        }
    }
    failed.hiddenHarnessCount = fails;
    if (CREATE === true)
    {
        fs.writeFileSync("/Users/Richard/Documents/test262-harness/results/baseline.txt", output.slice(0, -1));
    }
    makeSummary(failed, detailed, "failures");
    if (CREATE === false)
    {
        passed.hiddenHarnessCount = passes;
        makeSummary(passed, detailed, "passes");
    }
    console.log(`formatting results took ${Date.now() - start}ms`);
}

function makeSummary(obj, verbose, type)
{
    let output = `Test262 results\nIn total there were ${obj.hiddenHarnessCount} ${type} different to baseline ${obj.hiddenHarnessCount > 0 ? "comprised of" : ""}`;
    for (let folder in obj)
    {
        if ( folder != 'hiddenHarnessCount')
        {
            output += "\n" + handle (obj[folder], folder, verbose, type, 1);
        }
    }
    fs.writeFileSync(`/Users/Richard/Documents/test262-harness/results/summaryOf${type}.txt`, output);

}

function handle(obj, name, verbose, type, level)
{
    const names = Object.getOwnPropertyNames(obj);
    const hiddenHarnessCount = obj.hiddenHarnessCount;
    const length = obj.hasOwnProperty('length') ? obj.length : 0;
    const hasDepth = length > 0 ? hiddenHarnessCount > length : true; 
    let output = `\t${name.slice(0, -1)} which had ${hiddenHarnessCount} ${type} ${(hasDepth || verbose) ? "comprised of:" : ""}`;
    if (verbose && length > 0)
    {
        for (let i = 0; i < length; ++i)
        {
            output += `\n${"\t-".repeat(level + 1)} ${obj[i]}`; 
        }
    }
    const subs = names.length;
    for (let i = 0; i < subs; ++i)
    {
        const thisName = names[i];
        if (thisName !== 'length' && thisName !== 'hiddenHarnessCount' && Number.isNaN(parseInt(thisName)))
        {
            output += `\n${"\t-".repeat(level)}${handle(obj[thisName], thisName, verbose, type, level + 1)}`;
        }
    }
    return output;
}

function hasOrAdd(obj, prop)
{
    if (!(prop in obj))
    {
        obj[prop] = { hiddenHarnessCount : 1 };
    }
    else
    {
        ++obj[prop].hiddenHarnessCount;
    }
    return obj[prop];
}
