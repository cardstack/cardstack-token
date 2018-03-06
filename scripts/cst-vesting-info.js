const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const moment = require('moment');

const dateFormat = "YYYY-MM-DD HH:mm Z";

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", type: String },
  { name: "registry", alias: "r", type: String },
];

const usage = [
  {
    header: "cst-vesting-info",
    content: "This script displays vesting information for the specified beneficiary."
  },{
    header: "Options",
    optionList: [{
      name: "help",
      alias: "h",
      description: "Print this usage guide."
    },{
      name: "network",
      description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`."
    },{
      name: "address",
      description: "The address of the beneficiary for whom the vested tokens are relased."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
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

  let cst = await CardStackToken.at(cstAddress);

  let [ startDate,
    cliffDate,
    durationSec,
    fullyVestedAmount,
    vestedAmount,
    vestedAvailableAmount,
    releasedAmount,
    revokeDate,
    isRevocable ] = await cst.vestingSchedule(address);
  let releasableAmount = cst.releasableAmount(address);
  let cstSymbol = await cst.symbol();
  cstSymbol = cstSymbol || '';
  console.log(`
  Vesting information for beneficiary: ${address} ${revokeDate.toNumber() > 0 ? "Revoked on " + moment.unix(revokeDate.toNumber()).format(dateFormat) : ""}
      start date: ${moment.unix(startDate.toNumber()).format(dateFormat)}
      cliff date: ${moment.unix(cliffDate.toNumber()).format(dateFormat)}
      fully vested date: ${moment.unix(startDate.toNumber() + durationSec.toNumber()).format(dateFormat)}
      fully vested amount: ${fullyVestedAmount} ${cstSymbol}
      vested amount as of now (${moment().format(dateFormat)}): ${vestedAmount} ${cstSymbol}
      vested amount available as of now (${moment().format(dateFormat)}): ${vestedAvailableAmount} ${cstSymbol}
      vested amount already released: ${releasedAmount} ${cstSymbol}
      vested amount not yet released ${releasableAmount} ${cstSymbol}
      is revocable: ${isRevocable}
  `);

  callback();
};
