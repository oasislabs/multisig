import oasis from '@oasislabs/client';

jest.setTimeout(20000);

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

  afterAll(() => {
    oasis.disconnect();
  });
});
