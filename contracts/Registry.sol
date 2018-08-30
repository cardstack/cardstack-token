pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "zos-lib/contracts/migrations/Initializable.sol";
import "./ExternalStorage.sol";
import "./CstLedger.sol";
import "./Administratable.sol";
import "./Configurable.sol";
import "./IStorable.sol";
import "./Freezable.sol";
import "./ERC20.sol";

contract Registry is Initializable, Administratable {
  using SafeMath for uint256;

  /* zOS requires that the variables are never removed nor order changed
  /* BEGIN VARIABLES */
  string public constant version = "2";
  bytes4 private constant INTERFACE_META_ID = 0x01ffc9a7;
  bytes4 private constant ADDR_INTERFACE_ID = 0x3b3b57de;
  bytes32 private constant BARE_DOMAIN_NAMEHASH = 0x794941fae74d6435d1b29ee1c08cc39941ba78470872e6afd0693c7eeb63025c; // namehash for "cardstack.eth"
  mapping(bytes32 => address) public storageForHash;
  mapping(bytes32 => address) public contractForHash;
  mapping(bytes32 => bytes32) public hashForNamehash;
  mapping(bytes32 => bytes32) public namehashForHash;
  string[] public contractNameForIndex;
  /* END VARIABLES */

  event ContractRegistered(address indexed _contract, string _name, bytes32 namehash);
  event StorageAdded(address indexed storageAddress, string name);
  event StorageRemoved(address indexed storageAddress, string name);
  event AddrChanged(bytes32 indexed node, address a);

  function() public {
    revert();
  }

  function setNamehash(string contractName, bytes32 namehash) external onlySuperAdmins returns (bool) {
    require(namehash != 0x0);

    bytes32 hash = keccak256(abi.encodePacked(contractName));
    address contractAddress = contractForHash[hash];

    require(contractAddress != 0x0);
    require(hashForNamehash[namehash] == 0x0);

    hashForNamehash[namehash] = hash;
    namehashForHash[hash] = namehash;

    emit AddrChanged(namehash, contractAddress);
  }

  function register(string name, address contractAddress, bytes32 namehash) external onlySuperAdmins returns (bool) {
    bytes32 hash = keccak256(abi.encodePacked(name));
    require(bytes(name).length > 0);
    require(contractAddress != 0x0);
    require(contractForHash[hash] == 0x0);
    require(hashForNamehash[namehash] == 0x0);

    contractNameForIndex.push(name);
    contractForHash[hash] = contractAddress;

    if (namehash != 0x0) {
      hashForNamehash[namehash] = hash;
      namehashForHash[hash] = namehash;
    }

    address storageAddress = storageForHash[IStorable(contractAddress).getStorageNameHash()];
    address ledgerAddress = storageForHash[IStorable(contractAddress).getLedgerNameHash()];

    if (storageAddress != 0x0) {
      ExternalStorage(storageAddress).addAdmin(contractAddress);
    }
    if (ledgerAddress != 0x0) {
      CstLedger(ledgerAddress).addAdmin(contractAddress);
    }

    Configurable(contractAddress).configureFromStorage();

    emit ContractRegistered(contractAddress, name, namehash);

    if (namehash != 0x0) {
      emit AddrChanged(namehash, contractAddress);
    }

    return true;
  }

  function addStorage(string name, address storageAddress) external onlySuperAdmins {
    require(storageAddress != address(0));
    bytes32 hash = keccak256(abi.encodePacked(name));
    storageForHash[hash] = storageAddress;

    emit StorageAdded(storageAddress, name);
  }

  function initialize() public onlyInitializers isInitializer {
    initializeAdmins();
  }

  function removeStorage(string name) public onlySuperAdmins {
    address storageAddress = storageForHash[keccak256(abi.encodePacked(name))];
    delete storageForHash[keccak256(abi.encodePacked(name))];

    emit StorageRemoved(storageAddress, name);
  }

  function getStorage(string name) public view returns (address) {
    return storageForHash[keccak256(abi.encodePacked(name))];
  }

  function addr(bytes32 node) public view returns (address) {
    return contractForHash[hashForNamehash[node]];
  }

  function numContracts() public view returns(uint256) {
    return contractNameForIndex.length;
  }

  function getContractHash(string name) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(name));
  }

  function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
    return interfaceId == ADDR_INTERFACE_ID ||
           interfaceId == INTERFACE_META_ID;
  }
}

