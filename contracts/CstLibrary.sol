import "./ExternalStorage.sol";

library CstLibrary {
  function getTokenName(address _storage) constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value(sha3("cstTokenName"));
  }

  function setTokenName(address _storage, bytes32 tokenName) {
    ExternalStorage(_storage).setBytes32Value(sha3("cstTokenName"), tokenName);
  }

  function getTokenSymbol(address _storage) constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value(sha3("cstTokenSymbol"));
  }

  function setTokenSymbol(address _storage, bytes32 tokenName) {
    ExternalStorage(_storage).setBytes32Value(sha3("cstTokenSymbol"), tokenName);
  }

  function getBuyPrice(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue(sha3("cstBuyPrice"));
  }

  function setBuyPrice(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue(sha3("cstBuyPrice"), value);
  }

  function getSellPrice(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue(sha3("cstSellPrice"));
  }

  function setSellPrice(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue(sha3("cstSellPrice"), value);
  }

  function getSellCap(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue(sha3("cstSellCap"));
  }

  function setSellCap(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue(sha3("cstSellCap"), value);
  }
}
