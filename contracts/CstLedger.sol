pragma solidity ^0.4.2;

import "./administratable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract ITokenLedger {
  function totalTokens() constant returns (uint);
  function totalInCirculation() constant returns (uint);
  function balanceOf(address account) constant returns (uint);
  function mintTokens(uint amount);
  function transfer(address sender, address reciever, uint amount);
  function creditAccount(address account, uint amount);
  function debitAccount(address account, uint amount);
}

contract CstLedger is ITokenLedger, administratable {

  using SafeMath for uint256;

  uint public _totalInCirculation;
  uint public _totalTokens;
  mapping (address => uint) public _balanceOf;

  function totalTokens() constant returns (uint) {
    return _totalTokens;
  }

  function totalInCirculation() constant returns (uint) {
    return _totalInCirculation;
  }

  function balanceOf(address account) constant returns (uint) {
    return _balanceOf[account];
  }

  function mintTokens(uint amount) onlyAdmins {
    _totalTokens = _totalTokens.add(amount);
  }

  function transfer(address sender, address recipient, uint amount) onlyAdmins {
    require(_balanceOf[sender] >= amount);

    _balanceOf[sender] = _balanceOf[sender].sub(amount);
    _balanceOf[recipient] = _balanceOf[recipient].add(amount);
  }

  function creditAccount(address account, uint amount) onlyAdmins { // remove tokens
    require(_balanceOf[account] >= amount);

    _totalInCirculation = _totalInCirculation.sub(amount);
    _balanceOf[account] = _balanceOf[account].sub(amount);
  }

  function debitAccount(address account, uint amount) onlyAdmins { // add tokens
    _totalInCirculation = _totalInCirculation.add(amount);
    _balanceOf[account] = _balanceOf[account].add(amount);
  }
}
