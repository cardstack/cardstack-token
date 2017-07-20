pragma solidity ^0.4.2;

import "./owned.sol";

contract freezable is owned {
  mapping (address => bool) public frozenAccount;

  event FrozenFunds(address target, bool frozen);

  modifier unlessFrozen {
    require(!frozenAccount[msg.sender]);
    _;
  }

  function freezeAccount(address target, bool freeze) onlyOwner {
    frozenAccount[target] = freeze;
    FrozenFunds(target, freeze);
  }

}
