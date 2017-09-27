# cardstack-token
This project contains the smart contracts that govern the CardStack token.

## Prerequisites
* node 7.6+

* yarn

* [truffle](http://truffleframework.com/) to manage smart contracts (like ember-cli for Etherium). 
```
yarn global add truffle
```

* [geth](https://github.com/ethereum/go-ethereum/wiki/Installation-Instructions-for-Mac) to use as CLI ethereum wallet that truffle can manipulate.
```
brew tap ethereum/ethereum
brew install ethereum
```
After installing, run `geth account new` to create an account on your node.

## Installing
This project leverages node 7.6+, please make sure to install node 7.6+ (or use nvm to manage your node versions). Additionally, this project leverages yarn.

```
yarn install
```


## Testing
For testing we leverage a local private blockchain [testrpc](https://github.com/ethereumjs/testrpc). You must first start your private blockchain:
```
npm run testrpc
```

Additionally, we use the [Oraclize](http://www.oraclize.it/) service to create own own oracles from trusted web feeds. In order to test contracts that rely on these oracle functions we need to deploy a local Oraclize service within our private blockchain. After the testrpc has been started, start up the local Oraclize service:
```
npm run oraclize
```

then execute the tests:
```
npm test
```


## Deploying

### testrpc
To deploy the CST contracts to testrpc, start the testrpc blockchain. Make sure to not run the Mist client or Ethereum wallet connected to the testrpc when you perform the migration--testrpc is not good at walking and chewing gum at the same time.
```
npm run testrpc
```

Then from the commandline remove any previously created build artifacts so that you can trigger a full build:
```
rm -rf ./build
```

Then execute:
```
truffle migrate --reset --network=testrpc
```

Make a note of the address of the `Registry` and of the `CardStackToken` contract. Make sure not to lose the address of the Registry, the registry address is specified as a parameter for all contract ops commands.

Register the `CardStackToken` contract with the `Registry`:
```
truffle exec ./scripts/cst-register.js --cst=<CardStackToken's address> --registry=<Registry's address> --network=testrpc
```

You can view the CST system info by executing:
```
truffle exec ./scripts/system-info.js --network=testrpc -r <Registry's address> 
```

You can configure the price and details around CST by executing:
```
truffle exec ./scripts/cst-configure.js --tokenName="Cardstack Token" --tokenSymbol="CST" --buyPriceEth=0.005 --sellPriceEth=0.005 sellCap=50000000 --buyerPool=50000000 --maximumBalancePercentage=100% --foundation="<foundation address>" -r "<registry address>" --network=testrpc
```

You can mint new CST's (which must exist in order for people to buy) by executing:
```
truffle exec ./scripts/cst-mint-tokens.js --amount=1000000000 -r <registry address> --network=testrpc
```

You will need to whitelist buyers of CST by executing:
```
truffle exec ./scripts/cst-add-buyer.js --address=<buyer's address> -r <registry address> --network=testrpc
```

You can execute this script to get the purchase information for CST:
```
truffle exec ./scripts/cst-buy-info.js --network=testrpc -r <Registry's address>
```



### Rinkeby
To deploy the CST contracts on Rinkeby, make sure that your wallet's main account has at least 1.25 ETH (which is how much it currently costs to deploy the CST contracts as of 9/8/2017). Copy your wallet's main account address into the clipboard. Close the Mist or Ethereum wallet apps if they are open (geth cannot run when Mist is running and vice versa). Then from the commandline execute:
```
geth --rinkeby --rpc --rpcapi db,eth,net,web3,personal --unlock="main account's address"
```

Enter the password for your wallet when prompted, and then wait for the latest block in Rinkeby to download (you can double check the block number here at https://www.rinkeby.io/). After you see that the latest blocks have downloaded execute the following:

Then from the commandline remove any previously created build artifacts so that you can trigger a full build:
```
rm -rf ./build
```

Then execute:
```
truffle migrate --reset --network=rinkeby
```
The deploy will make many minutes to run depending on Rinkeby network stats.

Make a note of the address of the Registry and of the CardStackToken contract. Make sure not to lose the address of the Registry, the registry address is specified as a parameter for all contract ops commands.
Register the `CardStackToken` contract with the `Registry`:
```
truffle exec ./scripts/cst-register.js --cst=<CardStackToken's address> --registry=<Registry's address> --network=rinkeby
```

You can view the CST system info by executing:
```
truffle exec ./scripts/system-info.js --network=rinkeby -r <Registry's address> 
```

You can execute this script to get the purchase information for CST (make sure to set the price and mint tokens first before sharing this information, though):
```
truffle exec ./scripts/cst-buy-info.js --network=rinkeby -r <Registry's address>
```

From there you can execute other scripts to configure the CST contract and/or mint tokens, etc.

### mainnet
See CONTRACT-OPS.md for details on deploying to mainnet. 
