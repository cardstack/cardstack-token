pragma solidity 0.4.24;

contract IStorable {
  function getLedgerNameHash() external view returns (bytes32);
  function getStorageNameHash() external view returns (bytes32);
}
