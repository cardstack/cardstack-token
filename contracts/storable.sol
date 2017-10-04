pragma solidity ^0.4.13;

contract storable {
  function getLedgerNameHash() constant returns (bytes32);
  function getStorageNameHash() constant returns (bytes32);
}
