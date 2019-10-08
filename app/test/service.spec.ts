import oasis from '@oasislabs/client';

jest.setTimeout(20000);

const GAS_LIMIT = '0xF42400';
const OWNERS = ['b8b3666d8fea887d97ab54f571b8e5020c5c8b58'];

function hexStringToByte(str) {
  if (!str) {
    return new Uint8Array();
  }

  var a : number[] = [];
  for (var i = 0, len = str.length; i < len; i+=2) {
    a.push(parseInt(str.substr(i,2),16));
  }
  return new Uint8Array(a);
}

function parseAddresses(addresses) {
  let parsed : Uint8Array[] = [];
  for (var addr of addresses) {
    parsed.push(hexStringToByte(addr));
  }
  return parsed
}

describe('Deployments', () => {
  it ('should deploy non confidential', async () => {
    let multisig = await oasis.workspace.Multisig.deploy(
      parseAddresses(OWNERS), 1,
      {
        header: {confidential: false},
        gasLimit: GAS_LIMIT
      }
    );

    var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
    let counter = await oasis.workspace.MultisigCounter.deploy(multisig._inner.address, {
      header: {confidential: false},
      gasLimit: GAS_LIMIT
    });

    expect(multisig).toBeTruthy();
    expect(counter).toBeTruthy();
  });

  it ('should deploy confidential', async () => {
    let multisig = await oasis.workspace.Multisig.deploy(
      parseAddresses(OWNERS), 1,
      { header: {confidential: true}, gasLimit: GAS_LIMIT}
    );

    var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
    let counter = await oasis.workspace.MultisigCounter.deploy(multisig._inner.address, {
      header: {confidential: true},
      gasLimit: GAS_LIMIT
    });

    expect(multisig).toBeTruthy();
    expect(counter).toBeTruthy();
  });
});

describe('Test', () => {
  let multisig, counter;

  beforeAll(async () => {
    multisig = await oasis.workspace.Multisig.deploy(
      parseAddresses(OWNERS), 1,
      {
        header: {confidential: false},
        gasLimit: GAS_LIMIT
      }
    );

    var multisig_address = Buffer.from(multisig._inner.address).toString('hex');
    counter = await oasis.workspace.MultisigCounter.deploy(multisig._inner.address, {
      header: {confidential: false},
      gasLimit: GAS_LIMIT
    });
  });

  it('deployed', async () => {
    expect(multisig).toBeTruthy();
    expect(counter).toBeTruthy();
  });

  it('multisig getters work', async () => {
    expect(await multisig.getRequired({gasLimit: GAS_LIMIT})).toEqual(1);
    for (var func of counter._inner.idl.functions) {
      if (func.name == 'increment') {
        let coder = oasis.utils.OasisCoder.plaintext();
        let txData = Array.from(await coder.encoder.encode(func, []));
        let counter_address = Buffer.from(counter._inner.address).toString('hex');
        expect(await multisig.addTransaction(counter._inner.address, 0, txData, {gasLimit: GAS_LIMIT})).toEqual(0);
        expect(await multisig.isConfirmed(0, {gasLimit: GAS_LIMIT})).toEqual(false);
        await multisig.confirmTransaction(0, {gasLimit: GAS_LIMIT});
        expect(await multisig.isConfirmed(0, {gasLimit: GAS_LIMIT})).toEqual(true);
        await multisig.revokeConfirmation(0, {gasLimit: GAS_LIMIT});
        expect(await multisig.isConfirmed(0, {gasLimit: GAS_LIMIT})).toEqual(false);
        let tx = await multisig.getTransaction(0, {gasLimit: GAS_LIMIT});
        expect(Buffer.from(tx.destination).toString('hex')).toEqual(counter_address);
        expect(tx.value).toEqual(0);
        expect(tx.data).toEqual(txData);
      }
    }
  });

  it('can make the cross contract call', async () => {
    for (var func of counter._inner.idl.functions) {
      if (func.name == 'increment') {
        let coder = oasis.utils.OasisCoder.plaintext();
        let txData = Array.from(await coder.encoder.encode(func, []));
        let counter_address = Buffer.from(counter._inner.address).toString('hex');
        expect(await multisig.addTransaction(counter._inner.address, 0, txData, {gasLimit: GAS_LIMIT})).toEqual(1);
        await multisig.confirmTransaction(1, {gasLimit: GAS_LIMIT});
        expect(await multisig.isConfirmed(1, {gasLimit: GAS_LIMIT})).toEqual(true);
        expect(await counter.getCount({gasLimit: GAS_LIMIT})).toEqual(0);
        let result = await multisig.executeTransaction(1, {gasLimit: GAS_LIMIT});
        console.log(result);
        expect(await counter.getCount({gasLimit: GAS_LIMIT})).toEqual(1);
      }
    }
  });

  afterAll(() => {
    oasis.disconnect();
  });
});
