pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract freezable is Ownable {
  bool public frozenToken;
  mapping (address => bool) public frozenAccount;

  event FrozenFunds(address target, bool frozen);
  event FrozenToken(bool frozen);

  modifier unlessFrozen {
    require(!frozenToken);
    require(!frozenAccount[msg.sender]);
    _;
  }

  function freezeAccount(address target, bool freeze) onlyOwner {
    frozenAccount[target] = freeze;
    FrozenFunds(target, freeze);
  }

  function freezeToken(bool freeze) onlyOwner {
    frozenToken = freeze;
    FrozenToken(frozenToken);
  }

}
