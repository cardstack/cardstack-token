const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "message", type: String, description: "The message to sign." },
  { name: "address", type: String, description: "The address to sign with." },
];

const usage = [
  {
    header: "sign-message",
    content: "This script signs messages using your private key"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const { message, address, help } = commandLineArgs(optionsDefs);

  if (!message || help || !address) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let signedMessage = web3.eth.sign(address, web3.sha3(message));

  console.log(`Signed message:\n${signedMessage}`);
  callback();
};
