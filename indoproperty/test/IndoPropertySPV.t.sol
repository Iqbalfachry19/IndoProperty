// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/identity/IdentityRegistry.sol";
import "../src/compliance/IndoPropertyCompliance.sol";
import "../src/spv/IndoPropertySPVToken.sol";
import "../src/registry/SPVRegistry.sol";

/**
 * @title IndoPropertySPVTest
 * @notice Test suite untuk keseluruhan stack ERC-3643 + SPV IndoProperty
 */
contract IndoPropertySPVTest is Test {
    // =========================================================
    // Contracts
    // =========================================================
    IdentityRegistry public registry;
    IndoPropertyCompliance public compliance;
    IndoPropertySPVToken public token;
    SPVRegistry public spvRegistry;

    // =========================================================
    // Actors
    // =========================================================
    address public deployer = makeAddr("deployer");
    address public spvManager = makeAddr("spvManager");
    address public kycAgent = makeAddr("kycAgent");
    address public investorA = makeAddr("investorA"); // Indonesia
    address public investorB = makeAddr("investorB"); // Indonesia
    address public investorC = makeAddr("investorC"); // Asing (allowed)
    address public badActor = makeAddr("badActor"); // No KYC
    address public northKorea = makeAddr("northKorea"); // Restricted country

    address public identityA = makeAddr("identityA");
    address public identityB = makeAddr("identityB");
    address public identityC = makeAddr("identityC");
    address public identityNK = makeAddr("identityNK");

    // =========================================================
    // Constants
    // =========================================================
    uint256 constant PROPERTY_VALUE = 5_000_000_000; // Rp 5 miliar
    uint256 constant TOKEN_PRICE_IDR = 10_000_000; // Rp 10 juta per token
    uint256 constant TOTAL_SUPPLY = 500 * 1e18; // 500 token
    uint256 constant MIN_INVESTMENT = 1 * 1e18; // 1 token minimum

    uint16 constant ID_INDONESIA = 360;
    uint16 constant ID_SINGAPORE = 702;
    uint16 constant ID_NORTH_KOREA = 408; // Restricted

    // =========================================================
    // Setup
    // =========================================================
    function setUp() public {
        vm.startPrank(deployer);

        // Deploy identity registry
        registry = new IdentityRegistry();
        registry.addAgent(kycAgent);

        // Deploy compliance
        compliance = new IndoPropertyCompliance(address(registry));
        compliance.setMinInvestment(MIN_INVESTMENT);

        // Deploy SPV token
        token = new IndoPropertySPVToken(
            "Apartemen Green View Unit 12B",
            "Jl. Sudirman No. 45, Jakarta Selatan",
            "SHM-12345/2024",
            PROPERTY_VALUE,
            TOKEN_PRICE_IDR,
            72, // 72 m²
            700, // 7% yield
            address(registry),
            address(compliance),
            address(0), // onchainID (stub)
            spvManager
        );

        // Bind compliance
        compliance.bindToken(address(token));
        compliance.setWhitelisted(spvManager, true);
        compliance.setWhitelisted(address(token), true);

        vm.stopPrank();

        // Register investors (KYC)
        vm.startPrank(kycAgent);
        registry.registerIdentity(investorA, identityA, ID_INDONESIA);
        registry.registerIdentity(investorB, identityB, ID_INDONESIA);
        registry.registerIdentity(investorC, identityC, ID_SINGAPORE);
        registry.registerIdentity(northKorea, identityNK, ID_NORTH_KOREA);
        vm.stopPrank();

        // Mint initial tokens ke investorA dan B
        vm.startPrank(deployer);
        token.mint(investorA, 200 * 1e18); // 200 token
        token.mint(investorB, 200 * 1e18); // 200 token
        vm.stopPrank();
    }

    // =========================================================
    // Test: Identity Registry
    // =========================================================
    function test_RegistryContainsInvestors() public view {
        assertTrue(registry.contains(investorA));
        assertTrue(registry.contains(investorB));
        assertTrue(registry.contains(investorC));
        assertFalse(registry.contains(badActor));
    }

    function test_RegistryInvestorCountry() public view {
        assertEq(registry.investorCountry(investorA), ID_INDONESIA);
        assertEq(registry.investorCountry(investorC), ID_SINGAPORE);
    }

    function test_RegistryOnlyAgentCanRegister() public {
        vm.prank(badActor);
        vm.expectRevert("IdentityRegistry: not agent");
        registry.registerIdentity(badActor, makeAddr("badId"), ID_INDONESIA);
    }

    function test_RegistryCannotRegisterTwice() public {
        vm.prank(kycAgent);
        vm.expectRevert("IdentityRegistry: already registered");
        registry.registerIdentity(investorA, identityA, ID_INDONESIA);
    }

    function test_RegistryDeleteIdentity() public {
        vm.prank(kycAgent);
        registry.deleteIdentity(investorC);
        assertFalse(registry.contains(investorC));
    }

    function test_BatchRegisterIdentity() public {
        address[] memory users = new address[](2);
        address[] memory ids = new address[](2);
        uint16[] memory ctrs = new uint16[](2);
        users[0] = makeAddr("u1");
        ids[0] = makeAddr("id1");
        ctrs[0] = ID_INDONESIA;
        users[1] = makeAddr("u2");
        ids[1] = makeAddr("id2");
        ctrs[1] = ID_SINGAPORE;

        vm.prank(kycAgent);
        registry.batchRegisterIdentity(users, ids, ctrs);

        assertTrue(registry.contains(users[0]));
        assertTrue(registry.contains(users[1]));
    }

    // =========================================================
    // Test: Compliance
    // =========================================================
    function test_ComplianceBoundToken() public view {
        assertTrue(compliance.isTokenBound(address(token)));
    }

    function test_ComplianceCanTransferVerifiedInvestors() public {
        vm.warp(block.timestamp + 181 days);
        assertTrue(compliance.canTransfer(investorA, investorB, 10 * 1e18));
    }

    function test_ComplianceBlocksUnverifiedReceiver() public view {
        assertFalse(compliance.canTransfer(investorA, badActor, 10 * 1e18));
    }

    function test_ComplianceBlocksRestrictedCountry() public view {
        assertFalse(compliance.canTransfer(investorA, northKorea, 10 * 1e18));
    }

    function test_ComplianceBlocksBelowMinInvestment() public {
        // investorC belum hold token, jadi dianggap investor baru
        // transfer 0.5 token < MIN_INVESTMENT (1 token)
        vm.prank(deployer);
        token.mint(investorC, 1 * 1e18); // Dulu dulu biar bisa transfer

        // Sekarang coba transfer ke investorC seolah baru (fresh address)
        address newInvestor = makeAddr("newKyc");
        vm.prank(kycAgent);
        registry.registerIdentity(
            newInvestor,
            makeAddr("newKycId"),
            ID_INDONESIA
        );

        // 0.5 token < min investment 1 token
        assertFalse(compliance.canTransfer(investorA, newInvestor, 5 * 1e17));
    }

    function test_ComplianceHolderCount() public view {
        // investorA dan B sudah di-mint 200 masing-masing → holderCount = 2
        assertEq(compliance.holderCount(), 2);
    }

    function test_ComplianceMaxHolderEnforced() public {
        vm.prank(deployer);
        compliance.setMaxHolders(2); // sudah 2, tidak bisa tambah

        address newInv = makeAddr("newInv");
        vm.prank(kycAgent);
        registry.registerIdentity(newInv, makeAddr("newInvId"), ID_INDONESIA);

        // canTransfer harus false karena maxHolders sudah penuh
        assertFalse(compliance.canTransfer(investorA, newInv, MIN_INVESTMENT));
    }

    // =========================================================
    // Test: Token - Basic
    // =========================================================
    function test_TokenInitialBalances() public view {
        assertEq(token.balanceOf(investorA), 200 * 1e18);
        assertEq(token.balanceOf(investorB), 200 * 1e18);
    }

    function test_TokenTransferBetweenKycInvestors() public {
        vm.prank(investorA);
        vm.warp(block.timestamp + 181 days); // skip lock-up
        token.transfer(investorB, 10 * 1e18);
        assertEq(token.balanceOf(investorB), 210 * 1e18);
    }

    function test_TokenTransferBlockedByLockUp() public {
        // Lock-up belum lewat
        vm.prank(investorA);
        vm.expectRevert("Token: compliance rejected");
        token.transfer(investorB, 10 * 1e18);
    }

    function test_TokenTransferToUnverifiedReverts() public {
        vm.warp(block.timestamp + 181 days);
        vm.prank(investorA);
        vm.expectRevert("Token: receiver not KYC'd");
        token.transfer(badActor, 10 * 1e18);
    }

    function test_TokenPauseBlocksTransfers() public {
        vm.prank(deployer);
        token.pause();

        vm.warp(block.timestamp + 181 days);
        vm.prank(investorA);
        vm.expectRevert();
        token.transfer(investorB, 10 * 1e18);

        vm.prank(deployer);
        token.unpause();
    }

    function test_TokenFreezeAddress() public {
        vm.prank(deployer);
        token.setAddressFrozen(investorA, true);
        assertTrue(token.isFrozen(investorA));

        vm.warp(block.timestamp + 181 days);
        vm.prank(investorA);
        vm.expectRevert("Token: sender frozen");
        token.transfer(investorB, 10 * 1e18);
    }

    function test_TokenForcedTransfer() public {
        vm.warp(block.timestamp + 181 days);
        vm.prank(deployer);
        token.forcedTransfer(investorA, investorB, 50 * 1e18);
        assertEq(token.balanceOf(investorA), 150 * 1e18);
        assertEq(token.balanceOf(investorB), 250 * 1e18);
    }

    function test_TokenBurn() public {
        uint256 balBefore = token.balanceOf(investorA);
        vm.prank(deployer);
        token.burn(investorA, 50 * 1e18);
        assertEq(token.balanceOf(investorA), balBefore - 50 * 1e18);
    }

    function test_TokenMintOnlyAgent() public {
        vm.prank(badActor);
        vm.expectRevert("Token: not agent");
        token.mint(investorC, 10 * 1e18);
    }

    // =========================================================
    // Test: SPV - Rent Distribution
    // =========================================================
    function test_RentDepositAndClaim() public {
        uint256 rentAmount = 1 ether;

        // spvManager deposit sewa
        vm.deal(spvManager, rentAmount);
        vm.prank(spvManager);
        token.depositRent{value: rentAmount}();

        // investorA claim
        uint256 pendingA = token.pendingRentOf(investorA);
        // investorA: 200/400 token = 50% dari rent
        assertApproxEqAbs(pendingA, rentAmount / 2, 100);

        uint256 balBefore = investorA.balance;
        vm.prank(investorA);
        token.claimRent();
        assertApproxEqAbs(investorA.balance - balBefore, rentAmount / 2, 100);
    }

    function test_RentAccumulatesCorrectly() public {
        uint256 rent1 = 1 ether;
        uint256 rent2 = 2 ether;

        vm.deal(spvManager, rent1 + rent2);

        vm.prank(spvManager);
        token.depositRent{value: rent1}();

        vm.prank(spvManager);
        token.depositRent{value: rent2}();

        // Total 3 ETH, investorA (200/400 = 50%)
        uint256 expected = (rent1 + rent2) / 2;
        assertApproxEqAbs(token.pendingRentOf(investorA), expected, 100);
    }

    function test_NonManagerCannotDepositRent() public {
        vm.deal(badActor, 1 ether);
        vm.prank(badActor);
        vm.expectRevert("SPV: not manager");
        token.depositRent{value: 1 ether}();
    }

    function test_RentAfterTransfer() public {
        // investorA transfer token ke investorC setelah lockup
        vm.prank(deployer);
        token.mint(investorC, 1 * 1e18); // buat investorC eligible (>= min investment)

        vm.warp(block.timestamp + 181 days);
        vm.prank(investorA);
        token.transfer(investorC, 100 * 1e18);

        // Deposit sewa setelah transfer
        vm.deal(spvManager, 1 ether);
        vm.prank(spvManager);
        token.depositRent{value: 1 ether}();

        // investorA punya 100 token, investorB 200, investorC 101
        // Total ~401 token
        uint256 pendingA = token.pendingRentOf(investorA);
        uint256 pendingB = token.pendingRentOf(investorB);
        uint256 pendingC = token.pendingRentOf(investorC);
        // pendingA + pendingB + pendingC ≈ 1 ether
        assertApproxEqAbs(pendingA + pendingB + pendingC, 1 ether, 1000);
    }

    // =========================================================
    // Test: SPV Registry
    // =========================================================
    function test_SPVRegistryCreateSPV() public {
        vm.startPrank(deployer);
        IdentityRegistry sharedRegistry = new IdentityRegistry();
        SPVRegistry spvReg = new SPVRegistry(address(sharedRegistry));

        (uint256 spvId, address tokenAddr) = spvReg.createSPV(
            "Ruko BSD City A3",
            "Jl. Pahlawan Seribu, BSD City, Tangerang",
            "SHGB-88888/2023",
            2_500_000_000,
            5_000_000,
            120,
            850,
            100 * 1e18,
            spvManager,
            address(0),
            true
        );
        vm.stopPrank();

        assertEq(spvId, 0);
        assertTrue(tokenAddr != address(0));

        SPVRegistry.SPVRecord memory record = spvReg.getSPV(0);
        assertEq(record.tokenAddress, tokenAddr);
        assertTrue(record.active);
        assertEq(record.propertyName, "Ruko BSD City A3");
    }

    // =========================================================
    // Test: Fuzz
    // =========================================================
    function testFuzz_MintAndBurn(uint256 amount) public {
        // Batasi ke reasonable range (1 token - 1000 token)
        amount = bound(amount, MIN_INVESTMENT, 1000 * 1e18);

        vm.prank(deployer);
        token.mint(investorC, amount);
        assertEq(token.balanceOf(investorC), amount);

        vm.prank(deployer);
        token.burn(investorC, amount);
        assertEq(token.balanceOf(investorC), 0);
    }

    function testFuzz_RentDistribution(uint256 rentAmount) public {
        rentAmount = bound(rentAmount, 0.001 ether, 100 ether);
        vm.deal(spvManager, rentAmount);
        vm.prank(spvManager);
        token.depositRent{value: rentAmount}();

        uint256 pendingA = token.pendingRentOf(investorA);
        uint256 pendingB = token.pendingRentOf(investorB);
        assertApproxEqAbs(pendingA + pendingB, rentAmount, 1000);
    }
}
