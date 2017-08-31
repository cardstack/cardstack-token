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
    }
  }
};
