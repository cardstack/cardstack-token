async function proxyContract(AdminUpgradeabilityProxy, artifact, proxyAdmin, ...args) {
  let opts;
  if (args && args.length && typeof args[args.length -1] === 'object') {
    opts = args.pop();
  }

  console.log(`Deploying ${artifact.contractName} implementation...`);

  let implementationContract = await artifact.new(opts);
  console.log(`${artifact.contractName} implementation deployed to ${implementationContract.address}`);

  console.log(`Deploying ${artifact.contractName} proxy...`);
  let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);
  console.log(`${artifact.contractName} proxy deployed to ${proxy.address}`);

  console.log(`Setting proxyAdmin to ${proxyAdmin}...`);
  await proxy.changeAdmin(proxyAdmin);

  let contract = await artifact.at(proxy.address);

  console.log(`Initializing ${artifact.contractName} proxy with args ${JSON.stringify(args)}...`);
  await contract.initialize.apply(this, args);

  return { contract, proxy };
}

async function upgradeContract(AdminUpgradeabilityProxy, artifact, proxyAdmin, proxyAddress, opts) {
  console.log(`Deploying ${artifact.contractName} implementation...`);
  let contract = await artifact.new(opts);
  console.log(`${artifact.contractName} implementation deployed to ${contract.address}`);

  let proxy = await AdminUpgradeabilityProxy.at(proxyAddress);

  console.log(`Upgrading ${artifact.contractName} proxy ${proxyAddress} to new implementation...`);
  await proxy.upgradeTo(contract.address, { from: proxyAdmin });

  return { contract, proxy };
}

module.exports = {
  proxyContract,
  upgradeContract
};
