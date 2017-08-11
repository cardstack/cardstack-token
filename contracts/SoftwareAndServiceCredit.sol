pragma solidity ^0.4.2;

import "./owned.sol";
import "./freezable.sol";

contract SoftwareAndServiceCredit is owned, freezable {

  uint public sscExpirationSeconds = 60 * 60 * 24 * 30 * 6; // default to 6 months
  mapping (address => bool) public admins;
  mapping (address => bool) public applicationContracts;
  mapping (address => uint) public balanceOf;
  mapping (address => uint) public lastActiveTime;

  event SSCIssued(address indexed admin, address adminAddress, address indexed recipient, address recipientAddress, uint amount);
  event SSCBurned(address indexed admin, address adminAddress, address indexed recipient, address recipientAddress, uint amount);
  event SSCExpired(address indexed admin, address adminAddress, address indexed recipient, address recipientAddress, uint amount);

  modifier onlyAdmins {
    if (msg.sender != owner && !admins[msg.sender]) throw;
    _;
  }

  modifier onlyApplicationContracts {
    if (msg.sender != owner && !admins[msg.sender] && !applicationContracts[msg.sender]) throw;
    _;
  }

  function hasExpired(address account) constant returns (bool) {
  }

  function burn(address account, uint amount) onlyApplicationContracts unlessFrozen returns (bool) {
    lastActiveTime[account] = block.timestamp;
  }

  function issueSSC(address recipient, uint amount) onlyAdmins unlessFrozen {
    require(balanceOf[recipient] + amount > balanceOf[recipient]);

    lastActiveTime[recipient] = block.timestamp;
    balanceOf[recipient] += amount;

    SSCIssued(msg.sender, msg.sender, recipient, recipient, amount);
  }

  function addAdmin(address admin) onlyOwner {
    admins[admin] = true;
  }

  function removeAdmin(address admin) onlyOwner {
    delete admins[admin];
  }

  // TODO we should look up application contracts from the genesis contract instead of holding all those addresses here
  // this is just temp until we create the genesis contract
  function addApplicationContract(address appContract) onlyAdmins {
    applicationContracts[appContract] = true;
  }

  function removeApplicationContract(address appContract) onlyAdmins {
    delete applicationContracts[appContract];
  }

  function setSscExpiration(uint expirationDays) onlyOwner {
    require(expirationDays > 0);
  }

}
