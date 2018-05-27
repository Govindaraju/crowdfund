const path = require('path');
const solc = require('solc');
const fs = require('fs-extra');

const buildPath = path.resolve(__dirname,'build');

fs.removeSync(buildPath);

const fundingHubPath = path.resolve(__dirname,'contracts','FundingHub.sol');
const source = fs.readFileSync(fundingHubPath,'utf8');
const output = solc.compile(source,1).contracts;

fs.ensureDirSync(buildPath);

var keys = Object.keys(output);
keys.forEach(contract => {
    fs.outputJsonSync(
        path.resolve(buildPath,contract.replace(':',''  )+'.json'),
        output[contract]
    );
});

function log(message,data){
    console.log(message,data);
}
