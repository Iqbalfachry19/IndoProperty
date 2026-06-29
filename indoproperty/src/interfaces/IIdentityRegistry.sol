// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @notice Registry untuk identitas investor (KYC/AML compliance)
 * @dev Setiap investor harus terdaftar dan terverifikasi sebelum menerima token
 */
interface IIdentityRegistry {
    event IdentityRegistered(address indexed _investorAddress, address indexed _identity);
    event IdentityRemoved(address indexed _investorAddress, address indexed _identity);
    event IdentityUpdated(address indexed _oldIdentity, address indexed _newIdentity);
    event CountryUpdated(address indexed _investorAddress, uint16 indexed _country);
    event ClaimTopicsRegistrySet(address indexed _claimTopicsRegistry);
    event TrustedIssuersRegistrySet(address indexed _trustedIssuersRegistry);

    function registerIdentity(
        address _userAddress,
        address _identity,
        uint16 _country
    ) external;

    function deleteIdentity(address _userAddress) external;

    function setIdentityRegistryStorage(address _identityRegistryStorage) external;
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external;
    function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external;
    function updateCountry(address _userAddress, uint16 _country) external;
    function updateIdentity(address _userAddress, address _identity) external;

    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        address[] calldata _identities,
        uint16[] calldata _countries
    ) external;

    function contains(address _userAddress) external view returns (bool);
    function isVerified(address _userAddress) external view returns (bool);
    function identity(address _userAddress) external view returns (address);
    function investorCountry(address _userAddress) external view returns (uint16);
    function identityStorage() external view returns (address);
    function issuersRegistry() external view returns (address);
    function topicsRegistry() external view returns (address);
}
