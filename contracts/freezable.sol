pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract freezable is Ownable {
  bool public frozenToken;
  uint public totalFrozenAccounts;
  // TODO move this into external storage
  mapping (address => bool) public frozenAccount;
  mapping (uint => address) public frozenAccountForIndex;
  mapping (address => bool) processedAccount;

  event FrozenFunds(address indexed target, bool frozen);
  event FrozenToken(bool frozen);

  modifier unlessFrozen {
    require(!frozenToken);
    require(!frozenAccount[msg.sender]);
    _;
  }

  function freezeAccount(address target, bool freeze) onlyOwner {
    frozenAccount[target] = freeze;
    if (!processedAccount[target]) {
      processedAccount[target] = true;
      frozenAccountForIndex[totalFrozenAccounts] = target;
      totalFrozenAccounts += 1;
    }
    FrozenFunds(target, freeze);
  }

  function freezeToken(bool freeze) onlyOwner {
    frozenToken = freeze;
    FrozenToken(frozenToken);
  }

}
