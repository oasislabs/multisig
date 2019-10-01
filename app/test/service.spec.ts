import oasis from '@oasislabs/client';

jest.setTimeout(20000);

// describe('Deployments', () => {
//   it ('should deploy non confidential', async () => {
//     let multisig = await oasis.workspace.Multisig.deploy(
//       ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58'], 1,
//       { header: {confidential: false} }
//     );
//
//     var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
//     let counter = await oasis.workspace.MultisigCounter.deploy(multisig_address, {
//       header: {confidential: false}
//     });
//
//     expect(multisig).toBeTruthy();
//     expect(counter).toBeTruthy();
//   });
//
//   it ('should deploy confidential', async () => {
//     let multisig = await oasis.workspace.Multisig.deploy(
//       ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58'], 1,
//       { header: {confidential: true}, gasLimit: '0xF42400'}
//     );
//
//     var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
//     let counter = await oasis.workspace.MultisigCounter.deploy(multisig_address, {
//       header: {confidential: true},
//       gasLimit: '0xF42400'
//     });
//
//     expect(multisig).toBeTruthy();
//     expect(counter).toBeTruthy();
//   });
// });

describe('Test', () => {
  let multisig, counter;

  beforeAll(async () => {
    multisig = await oasis.workspace.Multisig.deploy(
      ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58'], 1,
      { header: {confidential: false} }
    );

    var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
    counter = await oasis.workspace.MultisigCounter.deploy(multisig_address, {
      header: {confidential: false}
    });
  });

  it('deployed', async () => {
    expect(multisig).toBeTruthy();
    expect(counter).toBeTruthy();
  });

  it('can upload transaction', async () => {
    for (var func of counter._inner.idl.functions) {
      if (func.name == 'increment') {
        console.log('hi');
        let coder = oasis.utils.OasisCoder.plaintext();
        let txData = Array.from(await coder.encoder.encode(func, []));
        let counter_address = Buffer.from(counter._inner.address).toString('hex');
        // console.log(multisig);
        // let req = await multisig.getRequired();
        // console.log(req);
        // expect(req).toEqual(1);
        let owner = Buffer.from((await multisig.getOwners())[0]).toString('hex');
        console.log(owner);
        console.log(await multisig.check({gasLimit: '0xF42400'}));
        console.log(counter_address);
        expect(await multisig.addTransaction(counter_address, 0, txData)).toEqual(0);
      }
    }
  });

  afterAll(() => {
    oasis.disconnect();
  });
});
