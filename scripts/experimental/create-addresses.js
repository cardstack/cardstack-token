const commandLineArgs = require('command-line-args');
const optionsDefs = [
  { name: "network", type: String },
  { name: "amount", alias: "a", type: Number},
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  let { amount } = options;

  if (!amount) {
    callback();
    return;
  }

  for (let i = 0; i < amount; i++) {
    let address = await web3.personal.newAccount();
    console.log(address);
  }
};
