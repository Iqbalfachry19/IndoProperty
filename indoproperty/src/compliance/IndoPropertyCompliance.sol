// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ICompliance.sol";
import "../interfaces/IIdentityRegistry.sol";

/**
 * @title IndoPropertyCompliance
 * @notice Compliance module khusus untuk SPV properti Indonesia (ERC-3643)
 * @dev Rules yang diimplementasikan:
 *      1. Max 300 pemegang token (Reg D / POJK limit)
 *      2. Negara terlarang (FATF blacklist)
 *      3. Minimum investasi per investor
 *      4. Lock-up period (jangka waktu holding minimum)
 *      5. Max kepemilikan per investor (anti-concentration)
 */
contract IndoPropertyCompliance is ICompliance, Ownable {
    // =========================================================
    // Constants
    // =========================================================
    uint16 public constant INDONESIA_COUNTRY_CODE = 360; // ISO 3166-1

    // =========================================================
    // State
    // =========================================================
    address public boundToken;
    IIdentityRegistry public identityRegistry;

    // Rule parameters
    uint256 public maxHolders = 300;
    uint256 public minInvestmentIDR = 10_000_000 * 1e18; // Rp 10 juta (dalam token units)
    uint256 public maxHoldingPercent = 20; // Max 20% dari total supply
    uint256 public lockUpPeriod = 180 days; // 6 bulan lock-up

    // State tracking
    uint256 public holderCount;
    mapping(address => uint256) public holderBalance;
    mapping(address => uint256) public firstAcquisitionTime;
    mapping(uint16 => bool) public restrictedCountries;
    mapping(address => bool) public whitelisted; // Exemptions (e.g., SPV itself)

    // =========================================================
    // Events
    // =========================================================
    event MaxHoldersUpdated(uint256 _max);
    event MinInvestmentUpdated(uint256 _min);
    event MaxHoldingPercentUpdated(uint256 _pct);
    event LockUpPeriodUpdated(uint256 _period);
    event CountryRestricted(uint16 _country, bool _restricted);
    event AddressWhitelisted(address _addr, bool _status);

    // =========================================================
    // Constructor
    // =========================================================
    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
        // FATF Black/Grey list country codes (simplified)
        restrictedCountries[408] = true; // Korea Utara
        restrictedCountries[364] = true; // Iran
        restrictedCountries[760] = true; // Syria
    }

    // =========================================================
    // Admin Config
    // =========================================================
    function setMaxHolders(uint256 _max) external onlyOwner {
        maxHolders = _max;
        emit MaxHoldersUpdated(_max);
    }

    function setMinInvestment(uint256 _min) external onlyOwner {
        minInvestmentIDR = _min;
        emit MinInvestmentUpdated(_min);
    }

    function setMaxHoldingPercent(uint256 _pct) external onlyOwner {
        require(_pct <= 100, "Compliance: percent > 100");
        maxHoldingPercent = _pct;
        emit MaxHoldingPercentUpdated(_pct);
    }

    function setLockUpPeriod(uint256 _period) external onlyOwner {
        lockUpPeriod = _period;
        emit LockUpPeriodUpdated(_period);
    }

    function setCountryRestriction(
        uint16 _country,
        bool _restricted
    ) external onlyOwner {
        restrictedCountries[_country] = _restricted;
        emit CountryRestricted(_country, _restricted);
    }

    function setWhitelisted(address _addr, bool _status) external onlyOwner {
        whitelisted[_addr] = _status;
        emit AddressWhitelisted(_addr, _status);
    }

    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    // =========================================================
    // ICompliance - Token Binding
    // =========================================================
    function bindToken(address _token) external override onlyOwner {
        require(boundToken == address(0), "Compliance: already bound");
        boundToken = _token;
        whitelisted[_token] = true; // Token contract itself bypass rules
        emit TokenBound(_token);
    }

    function unbindToken(address _token) external override onlyOwner {
        require(boundToken == _token, "Compliance: not bound token");
        boundToken = address(0);
        emit TokenUnbound(_token);
    }

    function isTokenBound(
        address _token
    ) external view override returns (bool) {
        return boundToken == _token;
    }

    // =========================================================
    // ICompliance - Transfer Hooks (called by token contract)
    // =========================================================
    function transferred(
        address _from,
        address _to,
        uint256 _value
    ) external override {
        require(msg.sender == boundToken, "Compliance: caller not token");

        // Update holder tracking
        if (!whitelisted[_from]) {
            holderBalance[_from] -= _value;
            if (holderBalance[_from] == 0) {
                holderCount--;
                delete firstAcquisitionTime[_from];
            }
        }
        if (!whitelisted[_to]) {
            if (holderBalance[_to] == 0) {
                holderCount++;
                firstAcquisitionTime[_to] = block.timestamp;
            }
            holderBalance[_to] += _value;
        }
    }

    function created(address _to, uint256 _value) external override {
        require(msg.sender == boundToken, "Compliance: caller not token");
        if (!whitelisted[_to]) {
            if (holderBalance[_to] == 0) {
                holderCount++;
                firstAcquisitionTime[_to] = block.timestamp;
            }
            holderBalance[_to] += _value;
        }
    }

    function destroyed(address _from, uint256 _value) external override {
        require(msg.sender == boundToken, "Compliance: caller not token");
        if (!whitelisted[_from]) {
            holderBalance[_from] -= _value;
            if (holderBalance[_from] == 0) {
                holderCount--;
                delete firstAcquisitionTime[_from];
            }
        }
    }

    // =========================================================
    // ICompliance - canTransfer (core compliance check)
    // =========================================================
    function canTransfer(
        address _from,
        address _to,
        uint256 _value
    ) external view override returns (bool) {
        // Whitelisted addresses bypass all checks
        if (whitelisted[_from] || whitelisted[_to]) return true;

        // 1. Penerima harus terverifikasi KYC
        if (!identityRegistry.isVerified(_to)) return false;

        // 2. Pengirim harus terverifikasi (kecuali mint dari address(0))
        if (_from != address(0) && !identityRegistry.isVerified(_from))
            return false;

        // 3. Cek negara terlarang
        uint16 toCountry = identityRegistry.investorCountry(_to);
        uint16 fromCountry = _from != address(0)
            ? identityRegistry.investorCountry(_from)
            : 0;
        if (restrictedCountries[toCountry] || restrictedCountries[fromCountry])
            return false;

        // 4. Lock-up period: pengirim harus sudah hold minimal lockUpPeriod
        if (_from != address(0) && firstAcquisitionTime[_from] != 0) {
            if (block.timestamp < firstAcquisitionTime[_from] + lockUpPeriod)
                return false;
        }

        // 5. Jumlah transfer harus >= minimum investasi (hanya untuk holder baru)
        if (holderBalance[_to] == 0 && _value < minInvestmentIDR) return false;

        // 6. Max holder count
        if (holderBalance[_to] == 0 && holderCount >= maxHolders) return false;

        // 7. Max holding concentration
        // (memerlukan total supply dari token — simplified: tidak dicek di sini
        //  karena butuh IERC20 import yang bisa circular; gunakan module pattern)

        return true;
    }
}
