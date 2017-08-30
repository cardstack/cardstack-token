pragma solidity ^0.4.2;

import "./IRewards.sol";
import "./startable.sol";
import "./initializable.sol";
import "./storable.sol";

// This is just a placeholder now for testing purposes
contract CstRewards is IRewards, startable, initializable, storable {

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

  function initializeFromStorage() returns (bool) {
    return true;
  }

  function start() returns (bool) {
    return true;
  }
}
