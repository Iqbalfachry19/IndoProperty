// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/identity/IdentityRegistry.sol";
import "../src/compliance/IndoPropertyCompliance.sol";
import "../src/spv/IndoPropertySPVToken.sol";
import "../src/registry/SPVRegistry.sol";

/**
 * @title DeployIndoPropertySPV
 * @notice Deployment script untuk full IndoProperty SPV stack
 *
 * Jalankan dengan:
 *   forge script script/DeployIndoPropertySPV.s.sol \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify
 */
contract DeployIndoPropertySPV is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        address spvManager  = vm.envOr("SPV_MANAGER", deployer);
        address kycAgent    = vm.envOr("KYC_AGENT", deployer);

        vm.startBroadcast(deployerKey);

        // ── 1. Identity Registry ──────────────────────────────
        IdentityRegistry identityRegistry = new IdentityRegistry();
        identityRegistry.addAgent(kycAgent);
        console.log("IdentityRegistry :", address(identityRegistry));

        // ── 2. Compliance ─────────────────────────────────────
        IndoPropertyCompliance compliance = new IndoPropertyCompliance(
            address(identityRegistry)
        );
        // Rp 10 juta minimum investment (token units dengan 18 desimal)
        compliance.setMinInvestment(10_000_000 * 1e18);
        console.log("Compliance        :", address(compliance));

        // ── 3. SPV Token ──────────────────────────────────────
        IndoPropertySPVToken token = new IndoPropertySPVToken(
            "Apartemen Green View Unit 12B",
            "Jl. Jend. Sudirman Kav. 45, Jakarta Selatan 12930",
            "SHM-12345/DKI/2024",
            5_000_000_000,   // Rp 5 miliar appraised value
            10_000_000,      // Rp 10 juta per token
            72,              // 72 m²
            700,             // 7% annual yield
            address(identityRegistry),
            address(compliance),
            address(0),      // onchainID: isi setelah deploy identity NFT
            spvManager
        );
        console.log("SPVToken          :", address(token));

        // ── 4. Bind & whitelist ───────────────────────────────
        compliance.bindToken(address(token));
        compliance.setWhitelisted(spvManager, true);
        compliance.setWhitelisted(address(token), true);

        // ── 5. SPV Registry ───────────────────────────────────
        SPVRegistry spvRegistry = new SPVRegistry(address(identityRegistry));
        console.log("SPVRegistry       :", address(spvRegistry));

        vm.stopBroadcast();

        // ── Output summary ────────────────────────────────────
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network           :", block.chainid);
        console.log("Deployer          :", deployer);
        console.log("SPV Manager       :", spvManager);
        console.log("KYC Agent         :", kycAgent);
        console.log("IdentityRegistry  :", address(identityRegistry));
        console.log("Compliance        :", address(compliance));
        console.log("SPVToken (PROP)   :", address(token));
        console.log("SPVRegistry       :", address(spvRegistry));
        console.log("==========================");
        console.log("\nNext steps:");
        console.log("1. Set KYC_AGENT sebagai agent di IdentityRegistry");
        console.log("2. Register investor addresses via registerIdentity()");
        console.log("3. Mint PROP token ke investor via token.mint()");
        console.log("4. SPV Manager dapat depositRent() setiap bulan");
    }
}
