pragma solidity ^0.4.2;

import "./owned.sol";
import "./freezable.sol";

contract CardStackToken is owned, freezable {

  uint public sellPrice = 1 ether / 1000;
  uint public buyPrice = 1 ether / 1000;
  string public name;
  string public symbol;
  uint public totalSupply;
  uint public totalInCirculation;
  uint public sellCap;

  /* This creates an array with all balances */
  mapping (address => uint) public balanceOf;

  /* This generates a public event on the blockchain that will notify clients */
  event Buy(address indexed buyer, address buyerAccount, uint value, uint purchasePrice);
  event Sell(address indexed seller, address sellerAccount, uint value, uint sellPrice);
  event Transfer(address indexed sender,
                 address senderAccount,
                 address indexed recipient,
                 address recipientAccount,
                 uint value);

  /* Initializes contract with initial supply tokens to the creator of the contract */
  function CardStackToken(
    uint initialSupply,
    string tokenName,
    string tokenSymbol,
    uint initialBuyPrice,
    uint initialSellPrice,
    uint initialCstSellCap
  ) {
    totalSupply = initialSupply;                        // Update total supply
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

  function transfer(address recipient, uint amount) unlessFrozen {
    require(!frozenAccount[recipient]);
    require(balanceOf[msg.sender] >= amount);
    require(balanceOf[recipient] + amount > balanceOf[recipient]); // check for overflow

    balanceOf[msg.sender] -= amount;
    balanceOf[recipient] += amount;
    Transfer(msg.sender, msg.sender, recipient, recipient, amount);
  }

  function mintTokens(address target, uint mintedAmount) onlyOwner {
    //TODO: provide the ability to mint coin without depositing in an account
    balanceOf[target] += mintedAmount;
    totalSupply += mintedAmount;
    // Transfer(0, this, mintedAmount);
    // Transfer(this, target, mintedAmount);
  }

  //TODO
  function grantTokens() onlyOwner {
  }

  //TODO
  function recycleTokens(/*address account, uint amount*/) {
  }

  //TODO
  // Talk to chris about how we want to release this, iterating over all the
  // accounts to distribute funds will cost a lot of gas
  function releaseTokensFromLockBox(/*uint amount*/) onlyOwner {
  }

  function setPrices(uint newSellPrice, uint newBuyPrice) onlyOwner {
    sellPrice = newSellPrice;
    buyPrice = newBuyPrice;
  }

  // TODO
  // require that sell cap cannot be set lower than the total CST in ciruclation
  function setCstSellCap(/*uint maxCstAmount*/) onlyOwner {
  }

  // TODO
  function cstAvailableToBuy() constant returns(bool) {
  }

  function buy() payable unlessFrozen {
    require(msg.value >= buyPrice);
    assert(buyPrice > 0);

    uint amount = msg.value / buyPrice;
    assert(totalInCirculation + amount <= sellCap);
    assert(amount <= totalSupply);
    assert(balanceOf[msg.sender] + amount > balanceOf[msg.sender]); // check for overflow

    balanceOf[msg.sender] += amount;
    totalSupply -= amount;
    totalInCirculation += amount;
    Buy(msg.sender, msg.sender, amount, msg.value);
  }

  function sell(uint amount) unlessFrozen {
    require(balanceOf[msg.sender] >= amount);
    uint value = amount * sellPrice;

    balanceOf[msg.sender] -= amount;
    totalSupply += amount;
    totalInCirculation -= amount;

    // always send only after changing state of contract to guard against re-entry attacks
    msg.sender.transfer(value);
    Sell(msg.sender, msg.sender, amount, value);
  }
}
