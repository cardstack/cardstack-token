pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./upgradeable.sol";
import "./ExternalStorage.sol";
import "./CstLedger.sol";
import "./administratable.sol";
import "./configurable.sol";
import "./storable.sol";
import "./freezable.sol";
import "./ERC20.sol";

contract Registry is Ownable, administratable, upgradeable {
  using SafeMath for uint256;

  bytes4 constant INTERFACE_META_ID = 0x01ffc9a7;
  bytes4 constant ADDR_INTERFACE_ID = 0x3b3b57de;
  bytes32 constant BARE_DOMAIN_NAMEHASH = 0x794941fae74d6435d1b29ee1c08cc39941ba78470872e6afd0693c7eeb63025c; // namehash for "cardstack.eth"

  uint256 public numContracts;
  mapping(bytes32 => address) public storageForHash;
  mapping(bytes32 => address) public contractForHash;
  mapping(bytes32 => bytes32) public hashForNamehash;
  mapping(bytes32 => bytes32) public namehashForHash;
  mapping(uint256 => string) public contractNameForIndex;

  event ContractRegistered(address indexed _contract, string _name, bytes32 namehash);
  event ContractUpgraded(address indexed successor, address indexed predecessor, string name, bytes32 namehash);
  event StorageAdded(address indexed storageAddress, string name);
  event StorageRemoved(address indexed storageAddress, string name);
  event AddrChanged(bytes32 indexed node, address a);

  function() public {
    revert();
  }

  function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
    return interfaceId == ADDR_INTERFACE_ID ||
           interfaceId == INTERFACE_META_ID;
  }

  function addr(bytes32 node) public view returns (address) {
    return contractForHash[hashForNamehash[node]];
  }

  function getContractHash(string name) public view unlessUpgraded returns (bytes32) {
    return keccak256(name);
  }

  function setNamehash(string contractName, bytes32 namehash) public onlySuperAdmins unlessUpgraded returns (bool) {
    require(namehash != 0x0);

    bytes32 hash = keccak256(contractName);
    address contractAddress = contractForHash[hash];

    require(contractAddress != 0x0);
    require(hashForNamehash[namehash] == 0x0);

    hashForNamehash[namehash] = hash;
    namehashForHash[hash] = namehash;

    emit AddrChanged(namehash, contractAddress);
  }

  function register(string name, address contractAddress, bytes32 namehash) public onlySuperAdmins unlessUpgraded returns (bool) {
    bytes32 hash = keccak256(name);
    require(bytes(name).length > 0);
    require(contractAddress != 0x0);
    require(contractForHash[hash] == 0x0);
    require(hashForNamehash[namehash] == 0x0);

    contractNameForIndex[numContracts] = name;
    contractForHash[hash] = contractAddress;

    if (namehash != 0x0) {
      hashForNamehash[namehash] = hash;
      namehashForHash[hash] = namehash;
    }

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

    emit ContractRegistered(contractAddress, name, namehash);

    if (namehash != 0x0) {
      emit AddrChanged(namehash, contractAddress);
    }

    return true;
  }

  function upgradeContract(string name, address successor) public onlySuperAdmins unlessUpgraded returns (bytes32) {
    bytes32 hash = keccak256(name);
    require(successor != 0x0);
    require(contractForHash[hash] != 0x0);

    address predecessor = contractForHash[hash];
    contractForHash[hash] = successor;

    uint256 remainingContractBalance;
    // we need https://github.com/ethereum/EIPs/issues/165
    // to be able to see if a contract is ERC20 or not...
    if (hash == keccak256("cst")) {
      remainingContractBalance = ERC20(predecessor).balanceOf(predecessor);
    }

    upgradeable(predecessor).upgradeTo(successor,
                                       remainingContractBalance);
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

    if (hashForNamehash[BARE_DOMAIN_NAMEHASH] == hash) {
      emit AddrChanged(BARE_DOMAIN_NAMEHASH, successor);
    }
    if (namehashForHash[hash] != 0x0 && namehashForHash[hash] != BARE_DOMAIN_NAMEHASH) {
      emit AddrChanged(namehashForHash[hash], successor);
    }

    emit ContractUpgraded(successor, predecessor, name, namehashForHash[hash]);
    return hash;
  }

  function addStorage(string name, address storageAddress) public onlySuperAdmins unlessUpgraded {
    bytes32 hash = keccak256(name);
    storageForHash[hash] = storageAddress;

    emit StorageAdded(storageAddress, name);
  }

  function getStorage(string name) public view unlessUpgraded returns (address) {
    return storageForHash[keccak256(name)];
  }

  function removeStorage(string name) public onlySuperAdmins unlessUpgraded {
    address storageAddress = storageForHash[keccak256(name)];
    delete storageForHash[keccak256(name)];

    emit StorageRemoved(storageAddress, name);
  }
}

