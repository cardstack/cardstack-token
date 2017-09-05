module.exports = {
  networks: {
    // this is for auotmated testing and development
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },

    // this is for testing migration and mist in testrpc
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },

    rinkeby: {
      host: "localhost", // Connect to geth on the specified
      port: 8545,
      from: "0x1E65F71b024937b988fdba09814d60049e0Fc59d",
      network_id: 4,
      gas: 4700000 // Gas limit used for deploys
    }
  }
};
