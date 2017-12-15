pragma solidity ^0.4.13;

import "./administratable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract ITokenLedger {
  function totalTokens() constant returns (uint256);
  function totalInCirculation() constant returns (uint256);
  function balanceOf(address account) constant returns (uint256);
  function mintTokens(uint256 amount);
  function transfer(address sender, address reciever, uint256 amount);
  function creditAccount(address account, uint256 amount);
  function debitAccount(address account, uint256 amount);
  function addAdmin(address admin);
  function removeAdmin(address admin);
}

contract CstLedger is ITokenLedger, administratable {

  using SafeMath for uint256;

  uint256 public _totalInCirculation; // warning this does not take into account unvested nor vested-unreleased tokens into consideration
  uint256 public _totalTokens;
  mapping (address => uint256) public _balanceOf;
  uint256 public ledgerCount;
  mapping (uint256 => address) public accountForIndex;
  mapping (address => bool) public accounts;

  function totalTokens() constant returns (uint256) {
    return _totalTokens;
  }

  function totalInCirculation() constant returns (uint256) {
    return _totalInCirculation;
  }

  function balanceOf(address account) constant returns (uint256) {
    return _balanceOf[account];
  }

  function mintTokens(uint256 amount) onlyAdmins {
    _totalTokens = _totalTokens.add(amount);
  }

  function makeAccountIterable(address account) internal {
    if (!accounts[account]) {
      accountForIndex[ledgerCount] = account;
      ledgerCount = ledgerCount.add(1);
      accounts[account] = true;
    }
  }

  function transfer(address sender, address recipient, uint256 amount) onlyAdmins {
    require(_balanceOf[sender] >= amount);

    _balanceOf[sender] = _balanceOf[sender].sub(amount);
    _balanceOf[recipient] = _balanceOf[recipient].add(amount);
    makeAccountIterable(recipient);
  }

  function creditAccount(address account, uint256 amount) onlyAdmins { // remove tokens
    require(_balanceOf[account] >= amount);

    _totalInCirculation = _totalInCirculation.sub(amount);
    _balanceOf[account] = _balanceOf[account].sub(amount);
  }

  function debitAccount(address account, uint256 amount) onlyAdmins { // add tokens
    _totalInCirculation = _totalInCirculation.add(amount);
    _balanceOf[account] = _balanceOf[account].add(amount);
    makeAccountIterable(account);
  }
}
