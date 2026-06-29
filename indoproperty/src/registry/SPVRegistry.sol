// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../spv/IndoPropertySPVToken.sol";
import "../identity/IdentityRegistry.sol";
import "../compliance/IndoPropertyCompliance.sol";

/**
 * @title SPVRegistry
 * @notice Factory + Registry untuk semua SPV properti yang diluncurkan
 * @dev Deploy kontrak ini sekali; gunakan createSPV() untuk tiap properti baru
 */
contract SPVRegistry is Ownable {
    // =========================================================
    // Structs
    // =========================================================
    struct SPVRecord {
        address tokenAddress;
        address identityRegistry;
        address compliance;
        string  propertyName;
        uint256 launchTime;
        bool    active;
    }

    // =========================================================
    // State
    // =========================================================
    mapping(uint256 => SPVRecord) public spvRecords;
    uint256 public spvCount;

    // Shared identity registry (opsional: atau per-SPV)
    address public sharedIdentityRegistry;

    // =========================================================
    // Events
    // =========================================================
    event SPVCreated(
        uint256 indexed spvId,
        address indexed tokenAddress,
        string  propertyName,
        uint256 appraisedValueIDR
    );
    event SPVDeactivated(uint256 indexed spvId);

    // =========================================================
    // Constructor
    // =========================================================
    constructor(address _sharedIdentityRegistry) Ownable(msg.sender) {
        sharedIdentityRegistry = _sharedIdentityRegistry;
    }

    // =========================================================
    // Factory
    // =========================================================
    /**
     * @notice Buat SPV baru untuk properti baru
     * @param _propertyName         Nama properti (e.g. "Apartemen Green View 12B")
     * @param _propertyAddress      Alamat fisik properti
     * @param _certificateNo        Nomor sertifikat (SHM/SHGB)
     * @param _appraisedValueIDR    Nilai appraisal dalam IDR
     * @param _tokenPriceIDR        Harga per token dalam IDR
     * @param _totalAreaM2          Luas m²
     * @param _expectedYieldBps     Yield tahunan (basis points)
     * @param _totalTokenSupply     Total token yang di-mint
     * @param _spvManager           Address manager properti
     * @param _onchainID            On-chain ID untuk token (bisa address(0) sementara)
     * @param _useSharedRegistry    Apakah menggunakan shared identity registry
     */
    function createSPV(
        string memory _propertyName,
        string memory _propertyAddress,
        string memory _certificateNo,
        uint256       _appraisedValueIDR,
        uint256       _tokenPriceIDR,
        uint256       _totalAreaM2,
        uint256       _expectedYieldBps,
        uint256       _totalTokenSupply,
        address       _spvManager,
        address       _onchainID,
        bool          _useSharedRegistry
    ) external onlyOwner returns (uint256 spvId, address tokenAddress) {
        // 1. Identity Registry
        address identityReg;
        if (_useSharedRegistry) {
            identityReg = sharedIdentityRegistry;
        } else {
            IdentityRegistry newRegistry = new IdentityRegistry();
            identityReg = address(newRegistry);
        }

        // 2. Compliance
        IndoPropertyCompliance compliance = new IndoPropertyCompliance(identityReg);

        // 3. Token
        IndoPropertySPVToken token = new IndoPropertySPVToken(
            _propertyName,
            _propertyAddress,
            _certificateNo,
            _appraisedValueIDR,
            _tokenPriceIDR,
            _totalAreaM2,
            _expectedYieldBps,
            identityReg,
            address(compliance),
            _onchainID,
            _spvManager
        );
        tokenAddress = address(token);

        // 4. Bind compliance ke token
        compliance.bindToken(tokenAddress);

        // 5. Whitelist SPV Manager di compliance
        compliance.setWhitelisted(_spvManager, true);

        // 6. Transfer ownership ke caller
        compliance.transferOwnership(msg.sender);
        token.transferOwnership(msg.sender);

        // 7. Register
        spvId = spvCount++;
        spvRecords[spvId] = SPVRecord({
            tokenAddress:    tokenAddress,
            identityRegistry: identityReg,
            compliance:      address(compliance),
            propertyName:    _propertyName,
            launchTime:      block.timestamp,
            active:          true
        });

        emit SPVCreated(spvId, tokenAddress, _propertyName, _appraisedValueIDR);
    }

    // =========================================================
    // Management
    // =========================================================
    function deactivateSPV(uint256 _spvId) external onlyOwner {
        spvRecords[_spvId].active = false;
        emit SPVDeactivated(_spvId);
    }

    function updateSharedRegistry(address _registry) external onlyOwner {
        sharedIdentityRegistry = _registry;
    }

    // =========================================================
    // View
    // =========================================================
    function getSPV(uint256 _spvId) external view returns (SPVRecord memory) {
        return spvRecords[_spvId];
    }

    function getAllActiveSPVs() external view returns (SPVRecord[] memory) {
        uint256 activeCount;
        for (uint256 i = 0; i < spvCount; i++) {
            if (spvRecords[i].active) activeCount++;
        }
        SPVRecord[] memory result = new SPVRecord[](activeCount);
        uint256 idx;
        for (uint256 i = 0; i < spvCount; i++) {
            if (spvRecords[i].active) result[idx++] = spvRecords[i];
        }
        return result;
    }
}
