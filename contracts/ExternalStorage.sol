pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Administratable.sol";

contract ExternalStorage is Administratable {
  using SafeMath for uint256;

  mapping(bytes32 => address[]) public primaryLedgerEntryForIndex;
  mapping(bytes32 => mapping(address => address[])) public secondaryLedgerEntryForIndex;
  mapping(bytes32 => address[]) public ledgerEntryForIndex;
  mapping(bytes32 => address[]) public booleanMapEntryForIndex;

  mapping(bytes32 => mapping(address => mapping(address => uint256))) private MultiLedgerStorage;
  mapping(bytes32 => mapping(address => bool)) private ledgerPrimaryEntries;
  mapping(bytes32 => mapping(address => mapping(address => bool))) private ledgerSecondaryEntries;
  mapping(bytes32 => mapping(address => uint256)) private LedgerStorage;
  mapping(bytes32 => mapping(address => bool)) private ledgerAccounts;
  mapping(bytes32 => mapping(address => bool)) private BooleanMapStorage;
  mapping(bytes32 => mapping(address => bool)) private booleanMapAccounts;
  mapping(bytes32 => uint256) private UIntStorage;
  mapping(bytes32 => bytes32) private Bytes32Storage;
  mapping(bytes32 => address) private AddressStorage;
  mapping(bytes32 => bytes) private BytesStorage;
  mapping(bytes32 => bool) private BooleanStorage;
  mapping(bytes32 => int256) private IntStorage;

  function getMultiLedgerValue(string record, address primaryAddress, address secondaryAddress) external view returns (uint256) {
    return MultiLedgerStorage[keccak256(abi.encodePacked(record))][primaryAddress][secondaryAddress];
  }

  function primaryLedgerCount(string record) external view returns (uint256) {
    return primaryLedgerEntryForIndex[keccak256(abi.encodePacked(record))].length;
  }

  function secondaryLedgerCount(string record, address primaryAddress) external view returns (uint256) {
    return secondaryLedgerEntryForIndex[keccak256(abi.encodePacked(record))][primaryAddress].length;
  }

  function setMultiLedgerValue(string record, address primaryAddress, address secondaryAddress, uint256 value) external onlyAdmins {
    bytes32 hash = keccak256(abi.encodePacked(record));
    if (!ledgerSecondaryEntries[hash][primaryAddress][secondaryAddress]) {
      secondaryLedgerEntryForIndex[hash][primaryAddress].push(secondaryAddress);
      ledgerSecondaryEntries[hash][primaryAddress][secondaryAddress] = true;

      if (!ledgerPrimaryEntries[hash][primaryAddress]) {
        primaryLedgerEntryForIndex[hash].push(primaryAddress);
        ledgerPrimaryEntries[hash][primaryAddress] = true;
      }
    }

    MultiLedgerStorage[hash][primaryAddress][secondaryAddress] = value;
  }

  function getLedgerValue(string record, address _address) external view returns (uint256) {
    return LedgerStorage[keccak256(abi.encodePacked(record))][_address];
  }

  function getLedgerCount(string record) external view returns (uint256) {
    return ledgerEntryForIndex[keccak256(abi.encodePacked(record))].length;
  }

  function setLedgerValue(string record, address _address, uint256 value) external onlyAdmins {
    bytes32 hash = keccak256(abi.encodePacked(record));
    if (!ledgerAccounts[hash][_address]) {
      ledgerEntryForIndex[hash].push(_address);
      ledgerAccounts[hash][_address] = true;
    }

    LedgerStorage[hash][_address] = value;
  }

  function getBooleanMapValue(string record, address _address) external view returns (bool) {
    return BooleanMapStorage[keccak256(abi.encodePacked(record))][_address];
  }

  function getBooleanMapCount(string record) external view returns (uint256) {
    return booleanMapEntryForIndex[keccak256(abi.encodePacked(record))].length;
  }

  function setBooleanMapValue(string record, address _address, bool value) external onlyAdmins {
    bytes32 hash = keccak256(abi.encodePacked(record));
    if (!booleanMapAccounts[hash][_address]) {
      booleanMapEntryForIndex[hash].push(_address);
      booleanMapAccounts[hash][_address] = true;
    }

    BooleanMapStorage[hash][_address] = value;
  }

  function getUIntValue(string record) external view returns (uint256) {
    return UIntStorage[keccak256(abi.encodePacked(record))];
  }

  function setUIntValue(string record, uint256 value) external onlyAdmins {
    UIntStorage[keccak256(abi.encodePacked(record))] = value;
  }

  function getBytes32Value(string record) external view returns (bytes32) {
    return Bytes32Storage[keccak256(abi.encodePacked(record))];
  }

  function setBytes32Value(string record, bytes32 value) external onlyAdmins {
    Bytes32Storage[keccak256(abi.encodePacked(record))] = value;
  }

  function getAddressValue(string record) external view returns (address) {
    return AddressStorage[keccak256(abi.encodePacked(record))];
  }

  function setAddressValue(string record, address value) external onlyAdmins {
    AddressStorage[keccak256(abi.encodePacked(record))] = value;
  }

  function getBytesValue(string record) external view returns (bytes) {
    return BytesStorage[keccak256(abi.encodePacked(record))];
  }

  function setBytesValue(string record, bytes value) external onlyAdmins {
    BytesStorage[keccak256(abi.encodePacked(record))] = value;
  }

  function getBooleanValue(string record) external view returns (bool) {
    return BooleanStorage[keccak256(abi.encodePacked(record))];
  }

  function setBooleanValue(string record, bool value) external onlyAdmins {
    BooleanStorage[keccak256(abi.encodePacked(record))] = value;
  }

  function getIntValue(string record) external view returns (int256) {
    return IntStorage[keccak256(abi.encodePacked(record))];
  }

  function setIntValue(string record, int256 value) external onlyAdmins {
    IntStorage[keccak256(abi.encodePacked(record))] = value;
  }
}
