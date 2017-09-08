In preparation for the CST ICO, this document describes pertinent information for auditing of the CST ERC-20 token.

## Overview

The CST ERC-20 token is inspired bt the "Colony" approach for composing our contracts (https://blog.colony.io/writing-upgradeable-contracts-in-solidity-6743f0eecc88). Specifically, in order to have a token that can be upgradable with the minimum expedenditure of gas, we have separated our contract data from the contract functionality. The idea that the CST ledger itself is a spearate entity from the ERC-20 contract. This approach, we feel, gives us the maximum amount of flexibility to leverage different types of token sales (e.g. Reverse Dutch Auction) that all operate upon the same ledger, as well as being able to upgrade our contracts without having to worry about gas fees for migrating ledger state into a new version of the contract.

In our contract design, we have extended the "colony" approach by also providing a "registry" contract. The idea is that we can register "named" storage, and "named" contracts with the registry. The registry keeps track of the `name => address` mapping for storage and for token contracts. When a contract is created, it is created with the name of the storage that it requires, e.g. `cstLedger` or `cstStorage`. The contract is then "registered" with the registry, and given a name itself. This registration action will associate the storage that the contract requires to a specific address of the registered CstLedger contract. Additionally, the contract being registered will be mapped to a name. When a new version of the contract is created, we can invoke an `upgrade()` function on the registry with the new version of a particular contract name. The Registry will then reassign the existing storage of the old contract to the new contract and deprecate the old contract. The registry keeps track of the address of the current version of the contract. Ideally we plan on leveraging the registry with ENS, so that `cardstack.eth` will resolve to the address of the most current version of the CST contract.

The CST token project leverages Truffle as our framework. We additionally have a suite of tests that are currently all passing and actually encompass all of our contracts beyond the contracts that are part of the ICO. The instructions for running the tests are described inteh main GitHub README.md.

Additionally, we've written scripts that are executed via `truffle exec` in the `scripts/` folder for performing contract operations on CST token, including: configuring the token, minting tokens, granting CST, freezing accounts, getting contract/ledger status, managing admins, etc.

A current version of the CST ERC-20 token has been deployed to Rinkeby. To purchase CST send ethers to:

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

This contract is an abtraction around the ledger that the CST ERC-20 uses. The idea being that we can plug this ledger into different token sale contract vehicles, from reverse dutch auction contracts to improved future versions of the current CST ERC-20 contracts. By spearating out our ledger from the main ERC-20 contract we provide more future flexibility while maintaining the CST ledger state in a consistent fashion. This contract has the notion of "admins" which are contracts that are able to manipulate the ledger. When a token contract is registered with the registry, the registry will grant a token contract admin capabilities for a ledger.

For our ledger, we use an iterable mapping approach so that we can easily introspect all the accounts that have CST.

### CstLibrary.sol

This is a library of functions that are used by the CST ERC-20 contract, that follows the "colony" approach for contract design. This library is primarily concered with interfacing business logic to the external storage contract.

### ExternalStorage.sol

This contract is a bucket of key-value storage. The idea is that this contract can hold any type of data value, which is assigned a key (including multidimensinoal ledgers which we use for the ERC-20 allowance mappings). I envision that contract may actualy take the place of the CstLedger in the future, as it can act as a ledger, in addition to other types of structured data.

Additionally, for all the ledger-type structures, we actually use an iterable mapping approach so that we can introspect these data structures.

### Migrations.sol

This contract is a boilerplate truffle contract used for contract deployments.

### Registry.sol

The Registry is the primary contract in the CST ecosystem. The registry's main purpose is to create an abstraction for the address of contracts that are used in the CST ecosystem. The idea being that contracts in the CST ecosystem use the Registry to discover other contracts in the CST ecosystem that they need to interact with. By decoupling contracts from addresses of other contracts we can provide a means by which contracts can be upgraded, as well to have their state seemlessly be shared with future versions and alternate version of the contracts managed by the registry.

Each contract in the CST ecosystem need to be registered with the registry. The registration process declares to the registry the name to use for the contract, as well to describe if the contract can act as a storage vehicle (by invoking `addStorage()`). As part of the registration process, the registry discovers what dependencies the contract being registered requires, and provides the contract being registered the addresses of the contracts that it needs, as well as to set/revoke administrative permissions appropriately on any contracts that it needs.

Additionally, the registry provides an `upgrade()` function which allows a successor contract to inherit the ledger and storage of its predecessor contract, and to become primary contract for the "name" of the contract being updated. Likewise, the predecessor contract is deprecated, its permissions are revoked from the storage it previously used, and all of its functions are disabled, except for functions that inform users where to find its successor contract.

### administratable.sol

This is a parent contract that is inherited by many of the contracts in the CST ecosystem. This contract provides 2 levels of adminisrative users: "admin" and "super admin". This contract provides the ability to add and remove admins and super admins, as well as, modifiers to lock down functions to only admins or super admins. 

Additionally, for our admins and super admins we use an iterable mapping approach so that we cna introspect all the addresses that have admin and super-admin capabilities for each contract.

### configurable.sol

This is an abstract contract that we use to allow a contract to configure itself from storage that it is assigned to from the registry.

### displayable.sol

This is a parent contract that provides a function that converts bytes32 to strings in the scenarios where we want to show strings for values that are stored as bytes32 within our storage structures.

### freezable.sol

This is a parent contract that provides capabilities that allow us to freeze/unfreeze a specific CST account or the entire CST token in the case of emergencies. We also use an iterable mapping approach so that we can introspect all the accounts that have been frozen. 

### storable.sol

This is an abstract contract that we use from the registry that allows a contract being registered to declare the name of the storage and ledger that it requires.

### upgradeable.sol

This is a parent contract that provides upgrade capabilities. Namely it provides functions that describe the predecessor and successor contracts, as well as, providing modifiers that easily allow us to turn off functions after a contract has been upgraded.

