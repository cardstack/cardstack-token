pragma solidity ^0.4.13;

import "./IRewards.sol";
import "./configurable.sol";
import "./storable.sol";

// This is just a placeholder now for testing purposes
contract CstRewards is IRewards, configurable, storable {

  // This is just some dummy state that we are using
  // from the tests to assert that processRewards was invoked.
  // The real version of this contract will likely have a differnt way to
  // assert this.
  bool public processingRewards;

  function processRewards() returns (bool) {
    processingRewards = true;

    return true;
  }

  function getLedgerNameHash() constant returns (bytes32) {
    return sha3("");
  }

  function getStorageNameHash() constant returns (bytes32) {
    return sha3("");
  }

  function configureFromStorage() returns (bool) {
    return true;
  }
}
