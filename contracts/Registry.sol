pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./upgradeable.sol";
import "./ExternalStorage.sol";
import "./CstLedger.sol";
import "./administratable.sol";
import "./configurable.sol";
import "./storable.sol";
import "./freezable.sol";

contract Registry is Ownable, administratable, upgradeable {
  using SafeMath for uint256;

  uint public numContracts;
  mapping(bytes32 => address) public storageForHash;
  mapping(bytes32 => address) public contractForHash;
  mapping(uint => string) public contractNameForIndex;

  event ContractRegistered(address indexed _contract, string _name);
  event ContractUpgraded(address indexed successor, address indexed predecessor, string name);

  function getContractHash(string name) constant unlessUpgraded returns (bytes32) {
    return sha3(name);
  }

  function register(string name, address contractAddress) onlySuperAdmins unlessUpgraded returns (bytes32) {
    bytes32 hash = sha3(name);
    require(bytes(name).length > 0);
    require(contractAddress != 0x0);
    require(contractForHash[hash] == 0x0);

    contractNameForIndex[numContracts] = name;
    contractForHash[hash] = contractAddress;

    numContracts = numContracts.add(1);

    address storageAddress = storageForHash[storable(contractAddress).getStorageNameHash()];
    address ledgerAddress = storageForHash[storable(contractAddress).getLedgerNameHash()];

    if (storageAddress != 0x0) {
      ExternalStorage(storageAddress).addAdmin(contractAddress);
    }
    if (ledgerAddress != 0x0) {
      CstLedger(ledgerAddress).addAdmin(contractAddress);
    }

    configurable(contractAddress).configureFromStorage();

    ContractRegistered(contractAddress, name);
    return hash;
  }

  function upgradeContract(string name, address successor) onlySuperAdmins unlessUpgraded returns (bytes32) {
    bytes32 hash = sha3(name);
    require(successor != 0x0);
    require(contractForHash[hash] != 0x0);

    address predecessor = contractForHash[hash];
    contractForHash[hash] = successor;

    upgradeable(predecessor).upgradeTo(successor);
    upgradeable(successor).upgradedFrom(predecessor);

    address successorStorageAddress = storageForHash[storable(successor).getStorageNameHash()];
    address successorLedgerAddress = storageForHash[storable(successor).getLedgerNameHash()];
    address predecessorStorageAddress = storageForHash[storable(predecessor).getStorageNameHash()];
    address predecessorLedgerAddress = storageForHash[storable(predecessor).getLedgerNameHash()];

    if (successorStorageAddress != 0x0) {
      ExternalStorage(successorStorageAddress).addAdmin(successor);
    }
    if (predecessorStorageAddress != 0x0) {
      ExternalStorage(predecessorStorageAddress).removeAdmin(predecessor);
    }

    if (successorLedgerAddress != 0x0) {
      CstLedger(successorLedgerAddress).addAdmin(successor);
    }
    if (predecessorLedgerAddress != 0x0) {
      CstLedger(predecessorLedgerAddress).removeAdmin(predecessor);
    }

    configurable(successor).configureFromStorage();

    ContractUpgraded(successor, predecessor, name);
    return hash;
  }

  function addStorage(string name, address storageAddress) onlySuperAdmins unlessUpgraded {
    bytes32 hash = sha3(name);
    storageForHash[hash] = storageAddress;
  }

  function getStorage(string name) constant unlessUpgraded returns (address) {
    return storageForHash[sha3(name)];
  }

  function removeStorage(string name) onlySuperAdmins unlessUpgraded {
    delete storageForHash[sha3(name)];
  }

  function setStorageUIntValue(string storageName, string fieldName, uint value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setUIntValue(fieldName, value);
  }

  function setMultiLedgerValue(string storageName, string fieldName, address primaryAddress, address secondaryAddress, uint value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setMultiLedgerValue(fieldName, primaryAddress, secondaryAddress, value);
  }

  function setLedgerValue(string storageName, string fieldName, address account, uint value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setLedgerValue(fieldName, account, value);
  }

  function setStorageBytes32Value(string storageName, string fieldName, bytes32 value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setBytes32Value(fieldName, value);
  }

  function setStorageBytesValue(string storageName, string fieldName, bytes value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setBytesValue(fieldName, value);
  }

  function setStorageAddressValue(string storageName, string fieldName, address value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setAddressValue(fieldName, value);
  }

  function setStorageBooleanValue(string storageName, string fieldName, bool value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setBooleanValue(fieldName, value);
  }

  function setStorageIntValue(string storageName, string fieldName, int value) onlySuperAdmins unlessUpgraded {
    address storageAddress = getStorage(storageName);
    ExternalStorage(storageAddress).setIntValue(fieldName, value);
  }

}

