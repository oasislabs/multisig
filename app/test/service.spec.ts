import oasis from '@oasislabs/client';

jest.setTimeout(20000);

describe('Deployments', () => {
  it ('should deploy non confidential', async () => {
    let multisig = await oasis.workspace.Multisig.deploy(
      ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58'], 1,
      { header: {confidential: false} }
    );

    var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
    let counter = await oasis.workspace.MultisigCounter.deploy(multisig_address, {
      header: {confidential: false}
    });

    expect(multisig).toBeTruthy();
    expect(counter).toBeTruthy();
  });

  it ('should deploy confidential', async () => {
    let multisig = await oasis.workspace.Multisig.deploy(
      ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58'], 1,
      { header: {confidential: true}, gasLimit: '0xF42400'}
    );

    var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
    let counter = await oasis.workspace.MultisigCounter.deploy(multisig_address, {
      header: {confidential: true},
      gasLimit: '0xF42400'
    });

    expect(multisig).toBeTruthy();
    expect(counter).toBeTruthy();
  });
});

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

  it('can make the cross contract call', async () => {
    for (var func of counter._inner.idl.functions) {
      if (func.name == 'increment') {
        let coder = oasis.utils.OasisCoder.plaintext();
        let txData = Array.from(await coder.encoder.encode(func, []));
        let counter_address = Buffer.from(counter._inner.address).toString('hex');
        expect(await multisig.addTransaction(counter_address, 0, txData, {gasLimit: '0xF42400'})).toEqual(0);
        await multisig.confirmTransaction(0, {gasLimit: '0xF42400'});
        expect(await multisig.isConfirmed(0, {gasLimit: '0xF42400'})).toEqual(true);
        expect(await counter.getCount({gasLimit: '0xF42400'})).toEqual(0);
        let result = await multisig.executeTransaction(0, {gasLimit: '0xF42400'});
        console.log(result);
        expect(await counter.getCount({gasLimit: '0xF42400'})).toEqual(1);
      }
    }
  });

  afterAll(() => {
    oasis.disconnect();
  });
});
