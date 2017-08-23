pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./freezable.sol";
import "./CstLedger.sol";
import "./ExternalStorage.sol";
import "./CstLibrary.sol";
import "./displayable.sol";
import "./upgradeable.sol";

// TODO add additional ERC20 Token standard functions for approving spends on your behalf and setting an allowance
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/StandardToken.sol

contract CardStackToken is Ownable, freezable, displayable, upgradeable {

  using SafeMath for uint256;
  using CstLibrary for address;

  ITokenLedger public tokenLedger;
  address public externalStorage;

  // These are mirrored in external storage so that state can live in future version of this contract
  // we save on gas prices by having these available as instance variables
  uint public sellPrice;
  uint public buyPrice;
  uint public sellCap;

  event SellCapChange(uint newSellCap);
  event PriceChange(uint newSellPrice, uint newBuyPrice);
  event Grant(address indexed recipient, address recipientAccount, uint value);
  event Mint(uint amountMinted, uint totalTokens, uint sellCap);
  event Buy(address indexed buyer, address buyerAccount, uint value, uint purchasePrice);
  event Sell(address indexed seller, address sellerAccount, uint value, uint sellPrice);
  event Transfer(address indexed sender,
                 address senderAccount,
                 address indexed recipient,
                 address recipientAccount,
                 uint value);

  function CardStackToken(address _tokenLedger, address _externalStorage) {
    frozenToken = true;

    tokenLedger = ITokenLedger(_tokenLedger);
    externalStorage = _externalStorage;
  }

  /* This unnamed function is called whenever someone tries to send ether to it */
  function () {
    throw;     // Prevents accidental sending of ether
  }

  function initialize(bytes32 _tokenName,
                      bytes32 _tokenSymbol,
                      uint _buyPrice,
                      uint _sellPrice,
                      uint _sellCap) onlyOwner unlessUpgraded {
    externalStorage.setTokenName(_tokenName);
    externalStorage.setTokenSymbol(_tokenSymbol);
    externalStorage.setBuyPrice(_buyPrice);
    externalStorage.setSellPrice(_sellPrice);
    externalStorage.setSellCap(_sellCap);

    sellPrice = _sellPrice;
    buyPrice = _buyPrice;
    sellCap = _sellCap;

    frozenToken = false;
  }

  function initializeFromStorage() onlyOwner unlessUpgraded {
    buyPrice = externalStorage.getBuyPrice();
    sellPrice = externalStorage.getSellPrice();
    sellCap = externalStorage.getSellCap();

    frozenToken = false;
  }

  function updateLedgerStorage(address newAddress) onlyOwner unlessUpgraded {
    tokenLedger = ITokenLedger(newAddress);
  }

  function updateExternalStorage(address newAddress) onlyOwner unlessUpgraded {
    externalStorage = newAddress;

    buyPrice = externalStorage.getBuyPrice();
    sellPrice = externalStorage.getSellPrice();
    sellCap = externalStorage.getSellCap();
  }

  function name() constant unlessUpgraded returns(string) {
    return bytes32ToString(externalStorage.getTokenName());
  }

  function symbol() constant unlessUpgraded returns(string) {
    return bytes32ToString(externalStorage.getTokenSymbol());
  }

  function totalInCirculation() constant unlessUpgraded returns(uint) {
    return tokenLedger.totalInCirculation();
  }

  function totalTokens() constant unlessUpgraded returns(uint) {
    return tokenLedger.totalTokens();
  }

  function balanceOf(address account) constant unlessUpgraded returns (uint) {
    return tokenLedger.balanceOf(account);
  }

  function transfer(address recipient, uint amount) unlessFrozen unlessUpgraded {
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    Transfer(msg.sender, msg.sender, recipient, recipient, amount);
  }

  function mintTokens(uint mintedAmount) onlyOwner unlessFrozen unlessUpgraded {
    tokenLedger.mintTokens(mintedAmount);
    Mint(mintedAmount, tokenLedger.totalTokens(), sellCap);
  }

  function grantTokens(address recipient, uint amount) onlyOwner unlessFrozen unlessUpgraded {
    require(amount <= tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation()));           // make sure there are enough tokens to grant

    tokenLedger.debitAccount(recipient, amount);
    Grant(recipient, recipient, amount);
  }

  function setPrices(uint newSellPrice, uint newBuyPrice) onlyOwner unlessUpgraded {
    require(newSellPrice > 0);
    require(newBuyPrice > 0);

    sellPrice = newSellPrice;
    buyPrice = newBuyPrice;

    externalStorage.setBuyPrice(newBuyPrice);
    externalStorage.setSellPrice(newSellPrice);

    PriceChange(newSellPrice, newBuyPrice);
  }

  function setSellCap(uint newSellCap) onlyOwner unlessUpgraded {
    sellCap = newSellCap;
    externalStorage.setSellCap(newSellCap);

    SellCapChange(newSellCap);
  }

  function cstAvailableToBuy() constant unlessUpgraded returns(bool) {
    return sellCap > tokenLedger.totalInCirculation();
  }

  function buy() payable unlessFrozen unlessUpgraded {
    require(msg.value >= buyPrice);
    assert(buyPrice > 0);

    uint amount = msg.value.div(buyPrice);
    uint supply = tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation());
    assert(tokenLedger.totalInCirculation().add(amount) <= sellCap);
    assert(amount <= supply);

    tokenLedger.debitAccount(msg.sender, amount);
    Buy(msg.sender, msg.sender, amount, msg.value);
  }

  function sell(uint amount) unlessFrozen unlessUpgraded {
    tokenLedger.creditAccount(msg.sender, amount);

    // always send only after changing state of contract to guard against re-entry attacks
    uint value = amount.mul(sellPrice);
    msg.sender.transfer(value);
    Sell(msg.sender, msg.sender, amount, value);
  }
}
