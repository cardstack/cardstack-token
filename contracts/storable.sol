pragma solidity ^0.4.13;

contract storable {
  function getLedgerNameHash() public constant returns (bytes32);
  function getStorageNameHash() public constant returns (bytes32);
}
