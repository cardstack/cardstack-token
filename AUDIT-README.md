In preparation for the CST ICO, this document describes pertinent information for auditing of the CST ERC-20 token.

## Overview

The CST ERC-20 token is inspired bt the "Colony" approach for composing our contracts (https://blog.colony.io/writing-upgradeable-contracts-in-solidity-6743f0eecc88). Specifically, in order to have a token that can be upgradable with the minimum expedenditure of gas, we have separated our contract data from the contract functionality. The idea that the CST ledger itself is a spearate entity from the ERC-20 contract. This approach, we feel, gives us the maximum amount of flexibility to leverage different types of token sales (e.g. Reverse Dutch Auction) that all operate upon the same ledger, as well as being able to upgrade our contracts without having to worry about gas fees for migrating ledger state into a new version of the contract.

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
* `contracts/CstLibrary.sol`
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
This is the main user facing ERC-20 contract that is used to purchase tokens. The constructor function for this contract is passed the address of the registry, the name of the ledger to use (whose address the registry provides), and the name of the storage to use (whose address is also provided by the registry). As in the "colony" approach, we opted to separate the ledger from all the other state that the contract holds. The "storage" contract is just a bucket of data that can accept any type of data (more on that in `ExternalStorage.sol`). The constructor will set the registry as an "super-admin" of the CST contract, meaning that the registry is granted a very powerful level of capabilities over this contract; namely the ability to upgrade the contract and to modify the contract that is used as the ledger and storage for the CST contract.

Note that the CST contract is not able to be used until it is "registered" with the registry. After the CST contract has been registered, which bascially amounts to assigning the contract a "name", it will then be able to be used.

A couple items to note about the CST contract where it extends beyond the ERC-20 spec are:

* We've provided the ability to change the storage contract that is used. This is a "break in case of emergency" affordance that we've provided in case we need to augment the ledger/storage contract of the CST contract without changing the CST contract's address the users will interact wiwth.

* We've provided the ability to freeze/unfreeze accounts as well as to freeze/unfreeze the entire CST token, also in case of emergency.

* The Cardstack Foundation is provided the ability to withdraw ETH from the CST contract, per our legal requirements. In the future phases of the CST users will also be able to sell CST back to CST contract, so we've provided a function for the Cardstack Foundation to also deposit ETH into the CST contract. As part of this we've also provided a function to set the minimum balance of ETH that the CST contract should maintain.

* The economic activity on the CST contract will eventually trigger rewards to be bestowed. We have provided an affordance to plug in a "Reward" contract in the future that will ultimately handle processing CST rewards.

### CstLedger.sol

### CstLibrary.sol

### ExternalStorage.sol

### Migrations.sol

### Registry.sol

### administratable.sol

### configurable.sol

### displayable.sol

### freezable.sol

### storable.sol

### upgradeable.sol

