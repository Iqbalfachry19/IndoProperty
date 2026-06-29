// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IERC3643.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/ICompliance.sol";

/**
 * @title ERC3643Token
 * @notice Base ERC-3643 Security Token (T-REX) implementation
 * @dev Extend contract ini untuk membuat token properti spesifik
 */
abstract contract ERC3643Token is ERC20, Ownable, Pausable, IERC3643 {
    // =========================================================
    // State
    // =========================================================
    string  private _tokenVersion;
    address private _onchainID;

    IIdentityRegistry public _identityRegistry;
    ICompliance       public _compliance;

    mapping(address => bool)    private _frozen;
    mapping(address => uint256) private _frozenTokens;

    // Authorized agents (transfer agents, issuers)
    mapping(address => bool) public isAgent;

    // =========================================================
    // Modifiers
    // =========================================================
    modifier onlyAgent() {
        require(isAgent[msg.sender] || msg.sender == owner(), "Token: not agent");
        _;
    }

    modifier whenNotFrozen(address _addr) {
        require(!_frozen[_addr], "Token: address frozen");
        _;
    }

    // =========================================================
    // Constructor
    // =========================================================
    constructor(
        string memory name_,
        string memory symbol_,
        address identityRegistry_,
        address compliance_,
        address onchainID_,
        string memory version_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _identityRegistry = IIdentityRegistry(identityRegistry_);
        _compliance       = ICompliance(compliance_);
        _onchainID        = onchainID_;
        _tokenVersion     = version_;
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
    // IERC3643 - Info
    // =========================================================
    function onchainID()       external view override returns (address) { return _onchainID; }
    function version()         external view override returns (string memory) { return _tokenVersion; }
    function identityRegistry() external view override returns (address) { return address(_identityRegistry); }
    function compliance()      external view override returns (address) { return address(_compliance); }
    function paused()          public view override(Pausable, IERC3643) returns (bool) { return super.paused(); }
    function isFrozen(address _userAddress)      external view override returns (bool)    { return _frozen[_userAddress]; }
    function getFrozenTokens(address _userAddress) external view override returns (uint256) { return _frozenTokens[_userAddress]; }

    // =========================================================
    // IERC3643 - Admin
    // =========================================================
    function setOnchainID(address _id) external override onlyOwner {
        _onchainID = _id;
        emit UpdatedTokenInformation(name(), symbol(), decimals(), _tokenVersion, _id);
    }

    function pause() external override onlyAgent {
        _pause();
        emit Paused(msg.sender);
    }

    function unpause() external override onlyAgent {
        _unpause();
        emit Unpaused(msg.sender);
    }

    function setAddressFrozen(address _userAddress, bool _freeze) external override onlyAgent {
        _frozen[_userAddress] = _freeze;
        emit AddressFrozen(_userAddress, _freeze, msg.sender);
    }

    function freezePartialTokens(address _userAddress, uint256 _amount) external override onlyAgent {
        require(
            balanceOf(_userAddress) - _frozenTokens[_userAddress] >= _amount,
            "Token: insufficient free balance"
        );
        _frozenTokens[_userAddress] += _amount;
        emit TokensFrozen(_userAddress, _amount);
    }

    function unfreezePartialTokens(address _userAddress, uint256 _amount) external override onlyAgent {
        require(_frozenTokens[_userAddress] >= _amount, "Token: insufficient frozen");
        _frozenTokens[_userAddress] -= _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }

    function setIdentityRegistry(address _registry) external override onlyOwner {
        _identityRegistry = IIdentityRegistry(_registry);
        emit IdentityRegistryAdded(_registry);
    }

    function setCompliance(address _comp) external override onlyOwner {
        _compliance = ICompliance(_comp);
        emit ComplianceAdded(_comp);
    }

    // =========================================================
    // IERC3643 - Mint / Burn
    // =========================================================
    function mint(address _to, uint256 _amount) external override onlyAgent {
        require(_identityRegistry.isVerified(_to), "Token: receiver not KYC'd");
        require(_compliance.canTransfer(address(0), _to, _amount), "Token: compliance rejected mint");
        _mint(_to, _amount);
        _compliance.created(_to, _amount);
    }

    function burn(address _userAddress, uint256 _amount) external override onlyAgent {
        uint256 freeBalance = balanceOf(_userAddress) - _frozenTokens[_userAddress];
        require(freeBalance >= _amount, "Token: insufficient free balance");
        _burn(_userAddress, _amount);
        _compliance.destroyed(_userAddress, _amount);
    }

    // =========================================================
    // IERC3643 - Forced Transfer
    // =========================================================
    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external override onlyAgent returns (bool) {
        require(_identityRegistry.isVerified(_to), "Token: receiver not KYC'd");
        uint256 freeBalance = balanceOf(_from) - _frozenTokens[_from];
        if (_amount > freeBalance) {
            uint256 toUnfreeze = _amount - freeBalance;
            _frozenTokens[_from] -= toUnfreeze;
            emit TokensUnfrozen(_from, toUnfreeze);
        }
        _transfer(_from, _to, _amount);
        _compliance.transferred(_from, _to, _amount);
        return true;
    }

    // =========================================================
    // IERC3643 - Batch Operations
    // =========================================================
    function batchTransfer(
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external override {
        require(_toList.length == _amounts.length, "Token: length mismatch");
        for (uint256 i = 0; i < _toList.length; i++) {
            transfer(_toList[i], _amounts[i]);
        }
    }

    function batchForcedTransfer(
        address[] calldata _fromList,
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external override onlyAgent {
        require(
            _fromList.length == _toList.length && _toList.length == _amounts.length,
            "Token: length mismatch"
        );
        for (uint256 i = 0; i < _fromList.length; i++) {
            this.forcedTransfer(_fromList[i], _toList[i], _amounts[i]);
        }
    }

    function batchMint(address[] calldata _toList, uint256[] calldata _amounts) external override onlyAgent {
        require(_toList.length == _amounts.length, "Token: length mismatch");
        for (uint256 i = 0; i < _toList.length; i++) {
            this.mint(_toList[i], _amounts[i]);
        }
    }

    function batchBurn(address[] calldata _userAddresses, uint256[] calldata _amounts) external override onlyAgent {
        require(_userAddresses.length == _amounts.length, "Token: length mismatch");
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            this.burn(_userAddresses[i], _amounts[i]);
        }
    }

    function batchSetAddressFrozen(
        address[] calldata _userAddresses,
        bool[]    calldata _freeze
    ) external override onlyAgent {
        require(_userAddresses.length == _freeze.length, "Token: length mismatch");
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            _frozen[_userAddresses[i]] = _freeze[i];
            emit AddressFrozen(_userAddresses[i], _freeze[i], msg.sender);
        }
    }

    function batchFreezePartialTokens(
        address[] calldata _userAddresses,
        uint256[] calldata _amounts
    ) external override onlyAgent {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            this.freezePartialTokens(_userAddresses[i], _amounts[i]);
        }
    }

    function batchUnfreezePartialTokens(
        address[] calldata _userAddresses,
        uint256[] calldata _amounts
    ) external override onlyAgent {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            this.unfreezePartialTokens(_userAddresses[i], _amounts[i]);
        }
    }

    // =========================================================
    // IERC3643 - Recovery
    // =========================================================
    function recoveryAddress(
        address _lostWallet,
        address _newWallet,
        address _investorOnchainID
    ) external override onlyAgent returns (bool) {
        require(
            _identityRegistry.identity(_lostWallet) == _investorOnchainID,
            "Token: identity mismatch"
        );
        uint256 balance = balanceOf(_lostWallet);
        _identityRegistry.updateIdentity(_lostWallet, address(0));
        _identityRegistry.registerIdentity(
            _newWallet,
            _investorOnchainID,
            _identityRegistry.investorCountry(_lostWallet)
        );
        _identityRegistry.deleteIdentity(_lostWallet);
        forcedTransfer(_lostWallet, _newWallet, balance);
        emit RecoverySuccess(_lostWallet, _newWallet, _investorOnchainID);
        return true;
    }

    // =========================================================
    // ERC20 Override — enforce compliance on all transfers
    // =========================================================
    function _update(
        address _from,
        address _to,
        uint256 _value
    ) internal override whenNotPaused {
        if (_from != address(0) && _to != address(0)) {
            // Normal transfer: check compliance + frozen state
            require(!_frozen[_from], "Token: sender frozen");
            require(!_frozen[_to],   "Token: receiver frozen");
            require(
                balanceOf(_from) - _frozenTokens[_from] >= _value,
                "Token: insufficient free balance"
            );
            require(
                _identityRegistry.isVerified(_to),
                "Token: receiver not KYC'd"
            );
            require(
                _compliance.canTransfer(_from, _to, _value),
                "Token: compliance rejected"
            );
            super._update(_from, _to, _value);
            _compliance.transferred(_from, _to, _value);
        } else {
            // Mint or burn — handled separately via mint()/burn()
            super._update(_from, _to, _value);
        }
    }
}
