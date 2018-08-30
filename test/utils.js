const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');

function isAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address) ? parseInt(address, 16) : false;
}

async function proxyContract(artifact, proxyAdmin, ...args) {
  let opts;
  if (args && args.length && typeof args[args.length -1] === 'object') {
    opts = args.pop();
  }

  let implementationContract = await artifact.new(opts);
  let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

  await proxy.changeAdmin(proxyAdmin);

  let contract = await artifact.at(proxy.address);

  await contract.initialize.apply(this, args);

  return { contract, proxy };
}

module.exports = {
  isAddress,
  proxyContract
};
