const chalk = require('chalk');
const oasis = require('@oasislabs/client');

oasis.workspace.Multisig.deploy({
  header: {confidential: false},
})
  .then(res => {
    let addrHex = Buffer.from(res._inner.address).toString('hex');
    console.log(`    ${chalk.green('Deployed')} Multisig at 0x${addrHex}`);
  })
  .catch(err => {
    console.error(
      `${chalk.red('error')}: could not deploy Multisig: ${err.message}`,
    );
  })
  .finally(() => {
    oasis.disconnect();
  });
