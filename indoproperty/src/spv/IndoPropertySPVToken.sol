// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "../token/ERC3643Token.sol";

/**
 * @title IndoPropertySPVToken
 * @notice Token keamanan ERC-3643 untuk SPV properti Indonesia
 *
 * @dev Representasi kepemilikan fraksional properti melalui SPV
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │             STRUKTUR SPV INDOPROPERTY                   │
 * │                                                         │
 * │  Investor (KYC'd) ──→ Beli PROP Token                  │
 * │                        │                                │
 * │                        ▼                                │
 * │              IndoPropertySPVToken (ERC-3643)            │
 * │                        │                                │
 * │                        ▼                                │
 * │              SPV Entity (PT Properti Nusantara)         │
 * │                        │                                │
 * │                        ▼                                │
 * │              Aset Properti Fisik                        │
 * │              (e.g. Apartemen Jakarta, Ruko BSD)         │
 * └─────────────────────────────────────────────────────────┘
 *
 * Distribusi:
 *  - Dividend (sewa) didistribusikan pro-rata ke holder via distributeRent()
 *  - Likuidasi: properti dijual, proceed didistribusikan via distributeProceeds()
 *
 * Tokenomics:
 *  - 1 PROP = kepemilikan fraksional 1/totalSupply dari nilai properti
 *  - Total supply = Nilai Properti / Harga Per Token
 *  - Minimum investasi: Rp 10.000.000
 */
contract IndoPropertySPVToken is ERC3643Token {
    // =========================================================
    // Constants
    // =========================================================
    uint8 private constant TOKEN_DECIMALS = 18;

    // =========================================================
    // SPV Property Metadata
    // =========================================================
    struct PropertyInfo {
        string  propertyName;       // e.g. "Apartemen Green View Unit 12B"
        string  propertyAddress;    // Alamat fisik
        string  certificateNo;      // No. SHM / SHGB
        uint256 appraisedValueIDR;  // Nilai appraisal (dalam IDR, tanpa desimal)
        uint256 tokenPriceIDR;      // Harga per token dalam IDR
        uint256 totalAreaM2;        // Luas total dalam m²
        uint256 expectedYieldBps;   // Yield tahunan dalam basis points (e.g. 700 = 7%)
        bool    isLiquidated;       // Apakah properti sudah dijual/likuidasi
    }

    PropertyInfo public propertyInfo;

    // =========================================================
    // Rent / Dividend Distribution
    // =========================================================
    uint256 public totalRentDistributed;
    uint256 public accRentPerToken;       // Accumulated rent per token (scaled 1e18)
    mapping(address => uint256) public rentDebt;   // Per-investor rent debt checkpoint
    mapping(address => uint256) public pendingRent; // Claimable rent

    // SPV manager yang mengelola properti
    address public spvManager;

    // =========================================================
    // Events
    // =========================================================
    event PropertyInfoUpdated(string propertyName, uint256 appraisedValueIDR);
    event RentDeposited(uint256 amount, uint256 timestamp);
    event RentClaimed(address indexed investor, uint256 amount);
    event SpvManagerUpdated(address indexed newManager);
    event PropertyLiquidated(uint256 proceedsAmount, uint256 timestamp);

    // =========================================================
    // Modifiers
    // =========================================================
    modifier onlySpvManager() {
        require(
            msg.sender == spvManager || msg.sender == owner(),
            "SPV: not manager"
        );
        _;
    }

    // =========================================================
    // Constructor
    // =========================================================
    constructor(
        string memory _propertyName,
        string memory _propertyAddress,
        string memory _certificateNo,
        uint256       _appraisedValueIDR,
        uint256       _tokenPriceIDR,
        uint256       _totalAreaM2,
        uint256       _expectedYieldBps,
        address       _identityRegistry,
        address       _compliance,
        address       _onchainID,
        address       _spvManager
    )
        ERC3643Token(
            string.concat("IndoProperty SPV - ", _propertyName),
            "PROP",
            _identityRegistry,
            _compliance,
            _onchainID,
            "1.0.0"
        )
    {
        propertyInfo = PropertyInfo({
            propertyName:      _propertyName,
            propertyAddress:   _propertyAddress,
            certificateNo:     _certificateNo,
            appraisedValueIDR: _appraisedValueIDR,
            tokenPriceIDR:     _tokenPriceIDR,
            totalAreaM2:       _totalAreaM2,
            expectedYieldBps:  _expectedYieldBps,
            isLiquidated:      false
        });

        spvManager = _spvManager;
        emit PropertyInfoUpdated(_propertyName, _appraisedValueIDR);
    }

    // =========================================================
    // Decimals override
    // =========================================================
    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    // =========================================================
    // SPV Management
    // =========================================================
    function updateSpvManager(address _newManager) external onlyOwner {
        spvManager = _newManager;
        emit SpvManagerUpdated(_newManager);
    }

    function updatePropertyInfo(
        uint256 _newAppraisedValue,
        uint256 _newYieldBps
    ) external onlySpvManager {
        propertyInfo.appraisedValueIDR = _newAppraisedValue;
        propertyInfo.expectedYieldBps  = _newYieldBps;
        emit PropertyInfoUpdated(propertyInfo.propertyName, _newAppraisedValue);
    }

    // =========================================================
    // Dividend / Rent Distribution (ETH-based untuk simplisitas)
    // =========================================================
    /**
     * @notice Deposit pendapatan sewa (dalam ETH/native token)
     * @dev SPV Manager mengirim ETH ke kontrak ini setelah menerima sewa
     *      Distribusi dihitung secara pro-rata berdasarkan balance saat ini
     */
    function depositRent() external payable onlySpvManager {
        require(msg.value > 0, "SPV: zero rent");
        require(totalSupply() > 0, "SPV: no token holders");
        require(!propertyInfo.isLiquidated, "SPV: liquidated");

        accRentPerToken += (msg.value * 1e18) / totalSupply();
        totalRentDistributed += msg.value;

        emit RentDeposited(msg.value, block.timestamp);
    }

    /**
     * @notice Klaim rent yang terakumulasi untuk investor
     */
    function claimRent() external {
        _updateRent(msg.sender);
        uint256 pending = pendingRent[msg.sender];
        require(pending > 0, "SPV: no pending rent");

        pendingRent[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{ value: pending }("");
        require(ok, "SPV: ETH transfer failed");

        emit RentClaimed(msg.sender, pending);
    }

    /**
     * @notice Cek pending rent untuk investor
     */
    function pendingRentOf(address _investor) external view returns (uint256) {
        uint256 pending = pendingRent[_investor];
        uint256 bal = balanceOf(_investor);
        if (bal > 0) {
            pending += (bal * (accRentPerToken - rentDebt[_investor])) / 1e18;
        }
        return pending;
    }

    // =========================================================
    // Liquidation
    // =========================================================
    function liquidate() external payable onlySpvManager {
        require(!propertyInfo.isLiquidated, "SPV: already liquidated");
        require(msg.value > 0, "SPV: no proceeds");

        propertyInfo.isLiquidated = true;

        // Distribusikan proceeds ke semua holder secara pro-rata
        // (dilakukan via accRentPerToken mechanism yang sama)
        accRentPerToken += (msg.value * 1e18) / totalSupply();

        emit PropertyLiquidated(msg.value, block.timestamp);
    }

    // =========================================================
    // Internal — Rent Accounting
    // =========================================================
    function _updateRent(address _investor) internal {
        uint256 bal = balanceOf(_investor);
        if (bal > 0) {
            pendingRent[_investor] += (bal * (accRentPerToken - rentDebt[_investor])) / 1e18;
        }
        rentDebt[_investor] = accRentPerToken;
    }

    /// @dev Override _update untuk update rent debt saat transfer
    function _update(address _from, address _to, uint256 _value) internal override {
        if (_from != address(0)) _updateRent(_from);
        if (_to   != address(0)) _updateRent(_to);
        super._update(_from, _to, _value);
    }

    // =========================================================
    // View helpers
    // =========================================================
    function tokenValueIDR() external view returns (uint256) {
        return propertyInfo.tokenPriceIDR;
    }

    function propertyValuePerToken() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (propertyInfo.appraisedValueIDR * 1e18) / totalSupply();
    }

    receive() external payable {}
}
