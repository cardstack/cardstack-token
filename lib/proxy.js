async function proxyContract(AdminUpgradeabilityProxy, artifact, proxyAdmin, ...args) {
  let opts;
  if (args && args.length && typeof args[args.length -1] === 'object') {
    opts = args.pop();
  }

  console.log(`Deploying ${artifact.contractName} implementation...`);

  let implementation = await artifact.new(opts);
  console.log(`${artifact.contractName} implementation deployed to ${implementation.address}`);

  console.log(`Deploying ${artifact.contractName} proxy...`);
  let proxy = await AdminUpgradeabilityProxy.new(implementation.address);
  console.log(`${artifact.contractName} proxy deployed to ${proxy.address}`);

  console.log(`Setting proxyAdmin to ${proxyAdmin}...`);
  await proxy.changeAdmin(proxyAdmin);

  let contract = await artifact.at(proxy.address);

  console.log(`Initializing ${artifact.contractName} proxy with args ${JSON.stringify(args)}...`);
  await contract.initialize.apply(this, args);

  return { contract, implementation, proxy };
}

async function upgradeContract(AdminUpgradeabilityProxy, artifact, proxyAdmin, proxyAddress, opts) {
  console.log(`Deploying ${artifact.contractName} implementation...`);
  let implementation = await artifact.new(opts);
  console.log(`${artifact.contractName} implementation deployed to ${implementation.address}`);

  let proxy = await AdminUpgradeabilityProxy.at(proxyAddress);

  console.log(`Upgrading ${artifact.contractName} proxy ${proxyAddress} to new implementation...`);
  await proxy.upgradeTo(implementation.address, { from: proxyAdmin });
  let contract = await artifact.at(proxyAddress);

  return { contract, proxy, implementation };
}

module.exports = {
  proxyContract,
  upgradeContract
};
