pragma solidity ^0.4.2;

import "./owned.sol";
import "./freezable.sol";
import "./open-zepplin/math/SafeMath.sol";


// TODO add an "upgradable" base contract to provide an upgrade path for the CST contract
// TODO add a function that can halt trading across the board for CST in case of emergency (based on consessys best practices)

// TODO add additional ERC20 Token standard functions for approving spends on your behalf and setting an allowance
// https://github.com/ConsenSys/Tokens

contract CardStackToken is owned, freezable {

  using SafeMath for uint256;
  // example: totalPayments = totalPayments.sub(payment);

  uint public sellPrice;
  uint public buyPrice;
  string public name;
  string public symbol;
  uint public totalInCirculation;
  uint public totalTokens;
  uint public sellCap;

  /* This creates an array with all balances */
  mapping (address => uint) public balanceOf;

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
    uint initialSupply,
    string tokenName,
    string tokenSymbol,
    uint initialBuyPrice,
    uint initialSellPrice,
    uint initialCstSellCap
  ) {
    totalTokens = initialSupply;                        // Update total supply
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

  function mintTokens(uint mintedAmount) onlyOwner unlessFrozen {
    require(totalTokens + mintedAmount > totalTokens); // test for overflow

    totalTokens += mintedAmount;
    Mint(mintedAmount, totalTokens, sellCap);
  }

  function grantTokens(address recipient, uint amount) onlyOwner unlessFrozen {
    require(amount <= totalTokens - totalInCirculation);           // make sure there are enough tokens to grant
    require(balanceOf[recipient] + amount > balanceOf[recipient]); // test for overflow

    totalInCirculation += amount;
    balanceOf[recipient] += amount;

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
    return sellCap > totalInCirculation;
  }

  function buy() payable unlessFrozen {
    require(msg.value >= buyPrice);
    assert(buyPrice > 0);

    uint amount = msg.value / buyPrice;
    uint supply = totalTokens - totalInCirculation;
    assert(totalInCirculation + amount <= sellCap);
    assert(amount <= supply);
    assert(balanceOf[msg.sender] + amount > balanceOf[msg.sender]); // check for overflow

    balanceOf[msg.sender] += amount;
    totalInCirculation += amount;
    Buy(msg.sender, msg.sender, amount, msg.value);
  }

  function sell(uint amount) unlessFrozen {
    require(balanceOf[msg.sender] >= amount);
    uint value = amount * sellPrice;

    balanceOf[msg.sender] -= amount;
    totalInCirculation -= amount;

    // always send only after changing state of contract to guard against re-entry attacks
    msg.sender.transfer(value);
    Sell(msg.sender, msg.sender, amount, value);
  }
}
