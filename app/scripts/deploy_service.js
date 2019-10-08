const chalk = require('chalk');
const oasis = require('@oasislabs/client');
const fs = require('fs');

const GAS_LIMIT = '0xF42400';

function hexStringToByte(str) {
  if (!str) {
    return new Uint8Array();
  }

  var a = [];
  for (var i = 0, len = str.length; i < len; i+=2) {
    a.push(parseInt(str.substr(i,2),16));
  }
  return new Uint8Array(a);
}

function parseAddresses(addresses) {
  let parsed = [];
  for (addr of addresses) {
    parsed.push(hexStringToByte(addr));
  }
  return parsed
}

// Modify the arguments to the Multisig deployment here.
var multisig_deploy = oasis.workspace.Multisig.deploy(
  parseAddresses(process.argv.slice(2, -2)), parseInt(process.argv.slice(-1)[0]),
  {
    header: {confidential: true},
    gasLimit: GAS_LIMIT
  }
);

multisig_deploy.then(async (multisig) => {
  var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
  console.log(`    ${chalk.green('Deployed')} Multisig at 0x${multisig_address}`);
  var counter_deploy = oasis.workspace.MultisigCounter.deploy(multisig._inner.address, {
    header: {confidential: true},
    gasLimit: GAS_LIMIT
  });

  counter_deploy.then(function(counter) {
    var counter_address = Buffer.from(counter._inner.address).toString('hex');
    console.log(`    ${chalk.green('Deployed')} Counter at 0x${counter_address}`);
    process.exit(0);
  });

  counter_deploy.catch(function(err) {
    console.error(`${chalk.red('error')}: could not deploy Counter: ${err.message}`);
    process.exit(1);
  })
});

multisig_deploy.catch(function(err) {
  console.error(`${chalk.red('error')}: could not deploy Multisig: ${err.message}`);
  process.exit(1);
});
