# cardstack-token
This project contains the smart contracts that govern the CardStack token.

## Prerequisites
* node 7.6+

* yarn

* [truffle](http://truffleframework.com/) to manage smart contracts (like ember-cli for Etherium). 
```
yarn global add truffle
```

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
TODO
