pragma solidity ^0.4.23;

contract storable {
  function getLedgerNameHash() public view returns (bytes32);
  function getStorageNameHash() public view returns (bytes32);
}
