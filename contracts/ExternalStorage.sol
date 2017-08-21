pragma solidity ^0.4.2;

import "./administratable.sol";

contract ExternalStorage is administratable {

  mapping(bytes32 => uint) UIntStorage;

  function getUIntValue(bytes32 record) constant returns (uint) {
    return UIntStorage[record];
  }

  function setUIntValue(bytes32 record, uint value) onlyAdmins {
    UIntStorage[record] = value;
  }

  mapping(bytes32 => bytes32) Bytes32Storage;

  function getBytes32Value(bytes32 record) constant returns (bytes32) {
    return Bytes32Storage[record];
  }

  function setBytes32Value(bytes32 record, bytes32 value) onlyAdmins {
    Bytes32Storage[record] = value;
  }

  mapping(bytes32 => address) AddressStorage;

  function getAddressValue(bytes32 record) constant returns (address) {
    return AddressStorage[record];
  }

  function setAddressValue(bytes32 record, address value) onlyAdmins {
    AddressStorage[record] = value;
  }

  mapping(bytes32 => bytes) BytesStorage;

  function getBytesValue(bytes32 record) constant returns (bytes) {
    return BytesStorage[record];
  }

  function setBytesValue(bytes32 record, bytes value) onlyAdmins {
    BytesStorage[record] = value;
  }

  mapping(bytes32 => bool) BooleanStorage;

  function getBooleanValue(bytes32 record) constant returns (bool) {
    return BooleanStorage[record];
  }

  function setBooleanValue(bytes32 record, bool value) onlyAdmins {
    BooleanStorage[record] = value;
  }

  mapping(bytes32 => int) IntStorage;

  function getIntValue(bytes32 record) constant returns (int) {
    return IntStorage[record];
  }

  function setIntValue(bytes32 record, int value) onlyAdmins {
    IntStorage[record] = value;
  }
}
