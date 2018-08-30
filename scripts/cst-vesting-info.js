const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const moment = require('moment');

const dateFormat = "YYYY-MM-DD HH:mm Z";

let RegistryContract = artifacts.require("./Registry.sol");
let CardstackToken = artifacts.require("./CardstackToken.sol");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  return (new web3.BigNumber(value)).div(decimalsFactor);
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
];

const usage = [
  {
    header: "cst-vesting-info",
    content: "This script displays vesting information for the specified beneficiary."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  let { network,
        address,
        registry,
        help } = commandLineArgs(optionsDefs);

  if (!address ||
     !network ||
     help ||
     !registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryContract = await RegistryContract.at(registry);

  console.log(`Using registry at ${registryContract.address}`);
  let cstAddress = await registryContract.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardstackToken.at(cstAddress);

  let [ startDate,
    cliffDate,
    durationSec,
    fullyVestedAmount,
    vestedAmount,
    vestedAvailableAmount,
    releasedAmount,
    revokeDate,
    isRevocable ] = await cst.vestingSchedule(address);
  let releasableAmount = await cst.releasableAmount(address);
  let cstSymbol = await cst.symbol();
  let decimals = await cst.decimals();

  console.log(`
  Vesting information for beneficiary: ${address} ${revokeDate.toNumber() > 0 ? "Revoked on " + moment.unix(revokeDate.toNumber()).format(dateFormat) : ""}
      start date: ${moment.unix(startDate.toNumber()).format(dateFormat)}
      cliff date: ${moment.unix(cliffDate.toNumber()).format(dateFormat)}
      fully vested date: ${moment.unix(startDate.toNumber() + durationSec.toNumber()).format(dateFormat)}
      fully vested amount: ${adjustForDecimals(fullyVestedAmount, decimals)} ${cstSymbol}
      vested amount as of now (${moment().format(dateFormat)}): ${adjustForDecimals(vestedAmount, decimals).toFixed(0)} ${cstSymbol}
      vested amount available as of now (${moment().format(dateFormat)}): ${adjustForDecimals(vestedAvailableAmount, decimals)} ${cstSymbol}
      vested amount already released: ${adjustForDecimals(releasedAmount, decimals)} ${cstSymbol}
      vested amount not yet released ${adjustForDecimals(releasableAmount, decimals)} ${cstSymbol}
      is revocable: ${isRevocable}
  `);

  callback();
};
