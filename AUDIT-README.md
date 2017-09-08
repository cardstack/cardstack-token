In preparation for the CST ICO, this document describes pertinent information for auditing of the CST ERC-20 token.

## Overview

The CST ERC-20 token is inspired bt the "Colony" approach for composing our contracts (https://blog.colony.io/writing-upgradeable-contracts-in-solidity-6743f0eecc88). Specifically, in order to have a token that can be upgradable with the minimum expedenditure of gas, we have separated our contract data from the contract functionality. The idea that the CST ledger itself is a spearate entity from the ERC-20 contract. This approach, we feel, gives us the maximum amount of flexibility to leverage different types of token sales that all operate upon the same ledger, as well as being able to upgrade our contracts without having to worry about gas fees for migrating ledger state into a new version of the contract.

In our contract design, we have extended the "colony" approach by also providing a "registry" contract. The idea is that we can register "named" storage, and "named" contracts with the registry. The registry keeps track of the `name => address` mapping for storage and for token contracts. When a contract is created, it is created with the name of the storage that it requires, e.g. `cstLedger` or `cstStorage`. The contract is then "registered" with the registry, and given a name itself. This registration action will associate the storage that the contract requires to a specific address of the registered CstLedger contract. Additionally, the contract being registered will be mapped to a name. When a new version of the contract is created, we can invoke an `upgrade()` function on the registry with the new version of a particular contract name. The Registry will then reassign the existing storage of the old contract to the new contract and deprecate the old contract. The registry keeps track of the address of the current version of the contract. Ideally we plan on leveraging the registry with ENS, so that `cardstack.eth` will resolve to the address of the most current version of the CST contract.

The CST token project leverages Truffle as our framework. We additionally have a suite of tests that are currently all passing and actually encompass all of our contracts beyond the contracts that are part of the ICO. The instructions for running the tests are described inteh main GitHub README.md.

Additionally, we've written scripts that are executed via `truffle exec` in the `scripts/` folder for performing contract operations on CST token, including: configuring the token, minting tokens, granting CST, freezing accounts, getting contract/ledger status, managing admins, etc.

A current version of the CST ERC-20 token has been deployed to Rinkeby. To purchase send ethers to:

**Address:**
```
 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e   
 ```
**Data:**
```
0xa6f2ae3a
``` 

The current price of CST in Rinkeby is 1 CST = 0.002 ETH

## Contracts to review

The contracts to review encompass the contracts that are currently part of our `migrations/` folder and their inherited parent contracts. This includes:
* `contracts/CardStackToken.sol`
* `contracts/CstLedger.sol`
* `contracts/ExternalStorage.sol`
* `contracts/Migrations.sol` (boilerplate from truffle)
* `contracts/Registry.sol`
* `contracts/administratable.sol`
* `contracts/configurable.sol`
* `contracts/displayable.sol`
* `contracts/freezable.sol`
* `contracts/storable.sol`
* `contracts/upgradeable.sol`

## Contract Details

A summary of each contract related to the ICO and its role in the overall system is described below:

### CardStackToken.sol

### CardStackToken.sol

### CstLedger.sol

### ExternalStorage.sol

### Migrations.sol

### Registry.sol

### administratable.sol

### configurable.sol

### displayable.sol

### freezable.sol

### storable.sol

### upgradeable.sol

