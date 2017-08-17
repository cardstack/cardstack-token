pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./freezable.sol";
import "./CstLedger.sol";


// TODO add an "upgradable" base contract to provide an upgrade path for the CST contract
// TODO add a function that can halt trading across the board for CST in case of emergency (based on consessys best practices)

// TODO add additional ERC20 Token standard functions for approving spends on your behalf and setting an allowance
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/StandardToken.sol

contract CardStackToken is Ownable, freezable {

  using SafeMath for uint256;

  uint public sellPrice;
  uint public buyPrice;
  string public name;
  string public symbol;
  uint public sellCap;
  ITokenLedger public tokenLedger;

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

  /* Initializes contract with initial supply tokens to the creator of the contract */
  function CardStackToken(
    address _tokenLedger,
    string tokenName,
    string tokenSymbol,
    uint initialBuyPrice,
    uint initialSellPrice,
    uint initialCstSellCap
  ) {
    tokenLedger = ITokenLedger(_tokenLedger);
    name = tokenName;                                   // Set the name for display purposes
    symbol = tokenSymbol;                               // Set the symbol for display purposes
    sellPrice = initialSellPrice;
    buyPrice = initialBuyPrice;
    sellCap = initialCstSellCap;
  }

  /* This unnamed function is called whenever someone tries to send ether to it */
  function () {
    throw;     // Prevents accidental sending of ether
  }

  function totalInCirculation() constant returns(uint) {
    return tokenLedger.totalInCirculation();
  }

  function totalTokens() constant returns(uint) {
    return tokenLedger.totalTokens();
  }

  function balanceOf(address account) constant returns (uint) {
    return tokenLedger.balanceOf(account);
  }

  function setTokenLedgerAddress(address _tokenLedger) onlyOwner {
    tokenLedger = ITokenLedger(_tokenLedger);
  }

  function transfer(address recipient, uint amount) unlessFrozen {
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    Transfer(msg.sender, msg.sender, recipient, recipient, amount);
  }

  function mintTokens(uint mintedAmount) onlyOwner unlessFrozen {
    tokenLedger.mintTokens(mintedAmount);
    Mint(mintedAmount, tokenLedger.totalTokens(), sellCap);
  }

  function grantTokens(address recipient, uint amount) onlyOwner unlessFrozen {
    require(amount <= tokenLedger.totalTokens() - tokenLedger.totalInCirculation());           // make sure there are enough tokens to grant

    tokenLedger.debitAccount(recipient, amount);
    Grant(recipient, recipient, amount);
  }

  function setPrices(uint newSellPrice, uint newBuyPrice) onlyOwner {
    require(newSellPrice > 0);
    require(newBuyPrice > 0);

    sellPrice = newSellPrice;
    buyPrice = newBuyPrice;

    PriceChange(newSellPrice, newBuyPrice);
  }

  function setSellCap(uint newSellCap) onlyOwner {
    sellCap = newSellCap;

    SellCapChange(newSellCap);
  }

  function cstAvailableToBuy() constant returns(bool) {
    return sellCap > tokenLedger.totalInCirculation();
  }

  function buy() payable unlessFrozen {
    require(msg.value >= buyPrice);
    assert(buyPrice > 0);

    uint amount = msg.value / buyPrice;
    uint supply = tokenLedger.totalTokens() - tokenLedger.totalInCirculation();
    assert(tokenLedger.totalInCirculation() + amount <= sellCap);
    assert(amount <= supply);

    tokenLedger.debitAccount(msg.sender, amount);
    Buy(msg.sender, msg.sender, amount, msg.value);
  }

  function sell(uint amount) unlessFrozen {
    tokenLedger.creditAccount(msg.sender, amount);

    // always send only after changing state of contract to guard against re-entry attacks
    uint value = amount * sellPrice;
    msg.sender.transfer(value);
    Sell(msg.sender, msg.sender, amount, value);
  }
}
