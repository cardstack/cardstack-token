pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract freezable is Ownable {
  using SafeMath for uint256;

  bool public frozenToken;
  uint256 public totalFrozenAccountsMapping;
  // TODO move this into external storage
  mapping (address => bool) public frozenAccount;
  mapping (uint256 => address) public frozenAccountForIndex;
  mapping (address => bool) processedAccount;

  event FrozenFunds(address indexed target, bool frozen);
  event FrozenToken(bool frozen);

  modifier unlessFrozen {
    require(!frozenToken);
    require(!frozenAccount[msg.sender]);
    _;
  }

  function freezeAccount(address target, bool freeze) public onlyOwner {
    frozenAccount[target] = freeze;
    if (!processedAccount[target]) {
      processedAccount[target] = true;
      frozenAccountForIndex[totalFrozenAccountsMapping] = target;
      totalFrozenAccountsMapping = totalFrozenAccountsMapping.add(1);
    }
    FrozenFunds(target, freeze);
  }

  function freezeToken(bool freeze) public onlyOwner {
    frozenToken = freeze;
    FrozenToken(frozenToken);
  }

}
