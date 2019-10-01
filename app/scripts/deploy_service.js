/**
 * Deploys a Hivemind contract to localhost:8546
 *
 * Usage: node deploy.js <model_config file path> <deposit_amount>
 */

const chalk = require('chalk');
const oasis = require('@oasislabs/client');
const fs = require('fs');

var multisig_deploy = oasis.workspace.Multisig.deploy(
  ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58', 'ff8c7955506c8f6ae9df7efbc3a26cc9105e1797'], 2,
  { header: {confidential: false} }
);

multisig_deploy.then(async (multisig) => {
  var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
  fs.writeFileSync('multisig_address', '0x' + multisig_address);
  console.log(`    ${chalk.green('Deployed')} Multisig at 0x${multisig_address}`);
  var counter_deploy = oasis.workspace.MultisigCounter.deploy(multisig_address, {
    header: {confidential: false}
  });

  counter_deploy.then(function(counter) {
    var counter_address = Buffer.from(counter._inner.address).toString('hex');
    fs.writeFileSync('counter_address', '0x' + counter_address);
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
