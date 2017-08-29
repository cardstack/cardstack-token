function isAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address) ? parseInt(address, 16) : false;
}

module.exports = {
  isAddress
}