import "./ExternalStorage.sol";

library CstLibrary {
  function getTokenName(address _storage) constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstTokenName");
  }

  function setTokenName(address _storage, bytes32 tokenName) {
    ExternalStorage(_storage).setBytes32Value("cstTokenName", tokenName);
  }

  function getTokenSymbol(address _storage) constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstTokenSymbol");
  }

  function setTokenSymbol(address _storage, bytes32 tokenName) {
    ExternalStorage(_storage).setBytes32Value("cstTokenSymbol", tokenName);
  }

  function getBuyPrice(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstBuyPrice");
  }

  function setBuyPrice(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstBuyPrice", value);
  }

  function getSellPrice(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstSellPrice");
  }

  function setSellPrice(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstSellPrice", value);
  }

  function getSellCap(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstSellCap");
  }

  function setSellCap(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstSellCap", value);
  }
}
