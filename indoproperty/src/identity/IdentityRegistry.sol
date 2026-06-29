// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IIdentityRegistry.sol";

/**
 * @title IdentityRegistry
 * @notice Registry on-chain untuk identitas investor IndoProperty SPV
 * @dev Menyimpan mapping wallet → identity + negara investor
 *      Digunakan token ERC-3643 untuk verifikasi sebelum transfer
 */
contract IdentityRegistry is IIdentityRegistry, Ownable {
    // =========================================================
    // Structs
    // =========================================================
    struct Identity {
        address identityAddress; // On-chain identity / KYC proof address
        uint16  country;         // ISO 3166-1 alpha-2 numeric country code (ID = 360)
        bool    exists;
    }

    // =========================================================
    // State
    // =========================================================
    mapping(address => Identity) private _identities;
    address[] private _registeredUsers;

    // Authorized agents (compliance officers, KYC providers)
    mapping(address => bool) public isAgent;

    // =========================================================
    // Modifiers
    // =========================================================
    modifier onlyAgent() {
        require(isAgent[msg.sender] || msg.sender == owner(), "IdentityRegistry: not agent");
        _;
    }

    // =========================================================
    // Constructor
    // =========================================================
    constructor() Ownable(msg.sender) {
        isAgent[msg.sender] = true;
    }

    // =========================================================
    // Agent Management
    // =========================================================
    function addAgent(address _agent) external onlyOwner {
        isAgent[_agent] = true;
    }

    function removeAgent(address _agent) external onlyOwner {
        isAgent[_agent] = false;
    }

    // =========================================================
    // IIdentityRegistry - Write
    // =========================================================
    function registerIdentity(
        address _userAddress,
        address _identity,
        uint16  _country
    ) external override onlyAgent {
        require(_userAddress != address(0), "IdentityRegistry: zero address");
        require(_identity    != address(0), "IdentityRegistry: zero identity");
        require(!_identities[_userAddress].exists, "IdentityRegistry: already registered");

        _identities[_userAddress] = Identity({
            identityAddress: _identity,
            country:         _country,
            exists:          true
        });
        _registeredUsers.push(_userAddress);

        emit IdentityRegistered(_userAddress, _identity);
    }

    function deleteIdentity(address _userAddress) external override onlyAgent {
        require(_identities[_userAddress].exists, "IdentityRegistry: not found");
        address identity_ = _identities[_userAddress].identityAddress;
        delete _identities[_userAddress];
        emit IdentityRemoved(_userAddress, identity_);
    }

    function updateIdentity(address _userAddress, address _newIdentity) external override onlyAgent {
        require(_identities[_userAddress].exists, "IdentityRegistry: not found");
        address old = _identities[_userAddress].identityAddress;
        _identities[_userAddress].identityAddress = _newIdentity;
        emit IdentityUpdated(old, _newIdentity);
    }

    function updateCountry(address _userAddress, uint16 _country) external override onlyAgent {
        require(_identities[_userAddress].exists, "IdentityRegistry: not found");
        _identities[_userAddress].country = _country;
        emit CountryUpdated(_userAddress, _country);
    }

    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        address[] calldata _identityAddresses,
        uint16[]  calldata _countries
    ) external override onlyAgent {
        require(
            _userAddresses.length == _identityAddresses.length &&
            _userAddresses.length == _countries.length,
            "IdentityRegistry: length mismatch"
        );
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            if (!_identities[_userAddresses[i]].exists) {
                _identities[_userAddresses[i]] = Identity({
                    identityAddress: _identityAddresses[i],
                    country:         _countries[i],
                    exists:          true
                });
                _registeredUsers.push(_userAddresses[i]);
                emit IdentityRegistered(_userAddresses[i], _identityAddresses[i]);
            }
        }
    }

    // Stub implementations (simplified — full impl would use external storage)
    function setIdentityRegistryStorage(address) external override onlyOwner {}
    function setClaimTopicsRegistry(address _r) external override onlyOwner { emit ClaimTopicsRegistrySet(_r); }
    function setTrustedIssuersRegistry(address _r) external override onlyOwner { emit TrustedIssuersRegistrySet(_r); }

    // =========================================================
    // IIdentityRegistry - Read
    // =========================================================
    function contains(address _userAddress) external view override returns (bool) {
        return _identities[_userAddress].exists;
    }

    /// @notice Investor dianggap verified jika terdaftar (simplified)
    ///         Implementasi penuh akan memeriksa Claim dari Trusted Issuers
    function isVerified(address _userAddress) external view override returns (bool) {
        return _identities[_userAddress].exists;
    }

    function identity(address _userAddress) external view override returns (address) {
        return _identities[_userAddress].identityAddress;
    }

    function investorCountry(address _userAddress) external view override returns (uint16) {
        return _identities[_userAddress].country;
    }

    function identityStorage() external view override returns (address) { return address(this); }
    function issuersRegistry()  external view override returns (address) { return address(0); }
    function topicsRegistry()   external view override returns (address) { return address(0); }

    function getAllUsers() external view returns (address[] memory) {
        return _registeredUsers;
    }
}
