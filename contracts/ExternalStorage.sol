pragma solidity ^0.4.2;

import "./administratable.sol";

contract ExternalStorage is administratable {

  mapping(address => uint) simpleLedger;

  function getBalanceFor(address _address) constant returns (uint) {
    return simpleLedger[_address];
  }

  function setBalance(address _address, uint value) onlyAdmins {
    simpleLedger[_address] = value;
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
