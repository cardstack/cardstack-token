pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./upgradeable.sol";

contract Registry is Ownable {
  using SafeMath for uint256;

  uint public numContracts;
  mapping(bytes32 => address) public contractForHash;
  mapping(uint => string) public contractNameForIndex;

  event ContractRegistered(address indexed contractAddress, string name);
  event ContractUpgraded(address indexed successor, address indexed predecessor, string name);

  function getContractHash(string name) constant returns (bytes32) {
    return sha3(name);
  }

  function addContract(string name, address contractAddress) onlyOwner returns (bytes32) {
    bytes32 hash = sha3(name);
    require(bytes(name).length > 0);
    require(contractAddress != 0x0);
    require(contractForHash[hash] == 0x0);

    contractNameForIndex[numContracts] = name;
    contractForHash[hash] = contractAddress;

    numContracts = numContracts.add(1);

    ContractRegistered(contractAddress, name);
    return hash;
  }

  function upgradeContract(string name, address successor) onlyOwner returns (bytes32) {
    bytes32 hash = sha3(name);
    require(successor != 0x0);
    require(contractForHash[hash] != 0x0);

    address predecessor = contractForHash[hash];
    contractForHash[hash] = successor;

    upgradeable(predecessor).upgradeTo(successor);
    upgradeable(successor).upgradedFrom(predecessor);

    return hash;
  }
}

