pragma solidity ^0.4.2;

import "./owned.sol";

contract CardStackToken is owned {

  uint public sellPrice = 1;
  uint public buyPrice = 1;
  string public name;
  string public symbol;
  uint public totalSupply;
  uint public totalInCirculation;

  /* This creates an array with all balances */
  mapping (address => uint) public balanceOf;
  mapping (address => mapping (address => uint)) public allowance;
  mapping (address => bool) public frozenAccount;

  /* This generates a public event on the blockchain that will notify clients */
  event FrozenFunds(address target, bool frozen);

  /* This generates a public event on the blockchain that will notify clients */
  event Transfer(address indexed from, address indexed to, uint value);

  /* Initializes contract with initial supply tokens to the creator of the contract */
  function CardStackToken(
    uint initialSupply,
    string tokenName,
    string tokenSymbol,
    uint initialBuyPrice,
    uint initialSellPrice
  ) {
    balanceOf[msg.sender] = initialSupply;              // Give the creator all initial tokens
    totalSupply = initialSupply;                        // Update total supply
    name = tokenName;                                   // Set the name for display purposes
    symbol = tokenSymbol;                               // Set the symbol for display purposes
    sellPrice = initialSellPrice;
    buyPrice = initialBuyPrice;
  }

  /* This unnamed function is called whenever someone tries to send ether to it */
  function () {
    throw;     // Prevents accidental sending of ether
  }

  /* Send coins */
  function transfer(address _to, uint _value) {
    if (balanceOf[msg.sender] < _value) throw;           // Check if the sender has enough
    if (balanceOf[_to] + _value < balanceOf[_to]) throw; // Check for overflows
    balanceOf[msg.sender] -= _value;                     // Subtract from the sender
    balanceOf[_to] += _value;                            // Add the same to the recipient
    Transfer(msg.sender, _to, _value);                   // Notify anyone listening that this transfer took place
  }


  function mintTokens(address target, uint mintedAmount) onlyOwner {
    //TODO: provide the ability to mint coin without depositing in an account
    balanceOf[target] += mintedAmount;
    totalSupply += mintedAmount;
    Transfer(0, this, mintedAmount);
    Transfer(this, target, mintedAmount);
  }

  //TODO
  function grantTokens() onlyOwner {
  }

  function freezeAccount(address target, bool freeze) onlyOwner {
    frozenAccount[target] = freeze;
    FrozenFunds(target, freeze);
  }

  function setPrices(uint newSellPrice, uint newBuyPrice) onlyOwner {
    sellPrice = newSellPrice;
    buyPrice = newBuyPrice;
  }

  function buy() payable {
    require(msg.value > 0);
    require(msg.value >= buyPrice);
    assert(buyPrice > 0);

    uint amount = msg.value / buyPrice;
    assert(amount <= totalSupply);

    balanceOf[msg.sender] += amount;
    totalSupply -= amount;
    totalInCirculation += amount;
    Transfer(this, msg.sender, amount);
  }

  function sell(uint amount) {
    if (balanceOf[msg.sender] < amount ) throw;        // checks if the sender has enough to sell
    balanceOf[this] += amount;                         // adds the amount to owner's balance
    balanceOf[msg.sender] -= amount;                   // subtracts the amount from seller's balance
    //TODO create function for user to withdraw ether instead of doing this
    if (!msg.sender.send(amount * sellPrice)) {        // sends ether to the seller. It's important
      throw;                                         // to do this last to avoid recursion attacks
    } else {
      Transfer(msg.sender, this, amount);            // executes an event reflecting on the change
    }
  }
}
