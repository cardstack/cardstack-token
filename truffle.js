module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    // this is for auotmated testing and development
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },

    // this is for testing scripts, migration, and mist in testrpc
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },

    rinkeby: {
      host: "localhost",
      port: 8545,
      from: process.env.WALLET,
      network_id: 4,
      gasPrice: 30000000000
    },

    mainnet: {
      host: "localhost",
      port: 8545,
      from: process.env.WALLET,
      network_id: 1,
      gasPrice: 8000000000 // Using 8 GWEI, make sure to double check eth gas station
    }
  }
};
