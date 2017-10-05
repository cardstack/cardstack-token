pragma solidity ^0.4.13;
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

  function getBuyPrice(address _storage) constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstBuyPrice");
  }

  function setBuyPrice(address _storage, uint256 value) {
    ExternalStorage(_storage).setUIntValue("cstBuyPrice", value);
  }

  function getSellPrice(address _storage) constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstSellPrice");
  }

  function setSellPrice(address _storage, uint256 value) {
    ExternalStorage(_storage).setUIntValue("cstSellPrice", value);
  }

  function getSellCap(address _storage) constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstSellCap");
  }

  function setSellCap(address _storage, uint256 value) {
    ExternalStorage(_storage).setUIntValue("cstSellCap", value);
  }

  function getMinimumBalance(address _storage) constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstMinimumBalance");
  }

  function setMinimumBalance(address _storage, uint256 value) {
    ExternalStorage(_storage).setUIntValue("cstMinimumBalance", value);
  }

  function getFoundation(address _storage) constant returns(address) {
    return ExternalStorage(_storage).getAddressValue("cstFoundation");
  }

  function setFoundation(address _storage, address value) {
    ExternalStorage(_storage).setAddressValue("cstFoundation", value);
  }

  function getAllowance(address _storage, address account, address spender) constant returns (uint256) {
    return ExternalStorage(_storage).getMultiLedgerValue("cstAllowance", account, spender);
  }

  function setAllowance(address _storage, address account, address spender, uint256 allowance) {
    ExternalStorage(_storage).setMultiLedgerValue("cstAllowance", account, spender, allowance);
  }

  function getRewardsContractHash(address _storage) constant returns (bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstRewardsContractHash");
  }

  function setRewardsContractHash(address _storage, bytes32 rewardsContractHash) {
    ExternalStorage(_storage).setBytes32Value("cstRewardsContractHash", rewardsContractHash);
  }

}
