pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./administratable.sol";

contract ExternalStorage is administratable {
  using SafeMath for uint256;

  mapping(bytes32 => mapping(address => mapping(address => uint))) MultiLedgerStorage;
  mapping(bytes32 => uint) public primaryLedgerCount;
  mapping(bytes32 => mapping(address => bool)) public ledgerPrimaryEntries;
  mapping(bytes32 => mapping(uint => address)) public primaryLedgerEntryForIndex;
  mapping(bytes32 => mapping(address => uint)) public secondaryLedgerCount;
  mapping(bytes32 => mapping(address => mapping(address => bool))) public ledgerSecondaryEntries;
  mapping(bytes32 => mapping(address => mapping(uint => address))) public secondaryLedgerEntryForIndex;

  function getMultiLedgerValue(string record, address primaryAddress, address secondaryAddress) constant returns (uint) {
    return MultiLedgerStorage[sha3(record)][primaryAddress][secondaryAddress];
  }

  function setMultiLedgerValue(string record, address primaryAddress, address secondaryAddress, uint value) onlyAdmins {
    bytes32 hash = sha3(record);
    uint primaryLedgerIndex = primaryLedgerCount[hash];
    uint secondaryLedgerIndex = secondaryLedgerCount[hash][primaryAddress];
    if (!ledgerSecondaryEntries[hash][primaryAddress][secondaryAddress]) {
      secondaryLedgerEntryForIndex[hash][primaryAddress][secondaryLedgerIndex] = secondaryAddress;
      secondaryLedgerCount[hash][primaryAddress] = secondaryLedgerIndex.add(1);
      ledgerSecondaryEntries[hash][primaryAddress][secondaryAddress] = true;

      if (!ledgerPrimaryEntries[hash][primaryAddress]) {
        primaryLedgerEntryForIndex[hash][primaryLedgerIndex] = primaryAddress;
        primaryLedgerCount[hash] = primaryLedgerIndex.add(1);
        ledgerPrimaryEntries[hash][primaryAddress] = true;
      }
    }

    MultiLedgerStorage[hash][primaryAddress][secondaryAddress] = value;
  }

  mapping(bytes32 => mapping(address => uint)) LedgerStorage;
  mapping(bytes32 => uint) public ledgerCount;
  mapping(bytes32 => mapping(address => bool)) public ledgerAccounts;
  mapping(bytes32 => mapping(uint => address)) public ledgerEntryForIndex;

  function getLedgerValue(string record, address _address) constant returns (uint) {
    return LedgerStorage[sha3(record)][_address];
  }

  function getLedgerCount(string record) constant returns (uint) {
    return ledgerCount[sha3(record)];
  }

  function setLedgerValue(string record, address _address, uint value) onlyAdmins {
    bytes32 hash = sha3(record);
    if (!ledgerAccounts[hash][_address]) {
      uint ledgerIndex = ledgerCount[hash];
      ledgerEntryForIndex[hash][ledgerIndex] = _address;
      ledgerCount[hash] = ledgerIndex.add(1);
      ledgerAccounts[hash][_address] = true;
    }

    LedgerStorage[hash][_address] = value;
  }

  mapping(bytes32 => uint) UIntStorage;

  function getUIntValue(string record) constant returns (uint) {
    return UIntStorage[sha3(record)];
  }

  function setUIntValue(string record, uint value) onlyAdmins {
    UIntStorage[sha3(record)] = value;
  }

  mapping(bytes32 => bytes32) Bytes32Storage;

  function getBytes32Value(string record) constant returns (bytes32) {
    return Bytes32Storage[sha3(record)];
  }

  function setBytes32Value(string record, bytes32 value) onlyAdmins {
    Bytes32Storage[sha3(record)] = value;
  }

  mapping(bytes32 => address) AddressStorage;

  function getAddressValue(string record) constant returns (address) {
    return AddressStorage[sha3(record)];
  }

  function setAddressValue(string record, address value) onlyAdmins {
    AddressStorage[sha3(record)] = value;
  }

  mapping(bytes32 => bytes) BytesStorage;

  function getBytesValue(string record) constant returns (bytes) {
    return BytesStorage[sha3(record)];
  }

  function setBytesValue(string record, bytes value) onlyAdmins {
    BytesStorage[sha3(record)] = value;
  }

  mapping(bytes32 => bool) BooleanStorage;

  function getBooleanValue(string record) constant returns (bool) {
    return BooleanStorage[sha3(record)];
  }

  function setBooleanValue(string record, bool value) onlyAdmins {
    BooleanStorage[sha3(record)] = value;
  }

  mapping(bytes32 => int) IntStorage;

  function getIntValue(string record) constant returns (int) {
    return IntStorage[sha3(record)];
  }

  function setIntValue(string record, int value) onlyAdmins {
    IntStorage[sha3(record)] = value;
  }
}
