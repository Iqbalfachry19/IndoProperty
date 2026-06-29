// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title ICompliance
 * @notice Interface untuk compliance rules pada transfer token
 * @dev Implementasi dapat memuat aturan: max holders, country restrictions, dll.
 */
interface ICompliance {
    event TokenBound(address indexed _token);
    event TokenUnbound(address indexed _token);

    function bindToken(address _token) external;
    function unbindToken(address _token) external;
    function transferred(address _from, address _to, uint256 _value) external;
    function created(address _to, uint256 _value) external;
    function destroyed(address _from, uint256 _value) external;
    function canTransfer(address _from, address _to, uint256 _value) external view returns (bool);
    function isTokenBound(address _token) external view returns (bool);
}
