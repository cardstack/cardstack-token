pragma solidity 0.4.24;

interface ITokenLedger {
  function mintTokens(uint256 amount) external;
  function transfer(address sender, address reciever, uint256 amount) external;
  function creditAccount(address account, uint256 amount) external;
  function debitAccount(address account, uint256 amount) external;
  function addAdmin(address admin) external;
  function removeAdmin(address admin) external;
  function totalTokens() external view returns (uint256);
  function totalInCirculation() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
}

