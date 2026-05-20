import { tool } from "ai";
import { z } from "zod";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

/**
 * Token-launch tool. Builds ONE unsigned transaction that:
 *   1. Creates a fresh mint account at an ephemeral address
 *   2. Initializes it with the user's wallet as mint & freeze authority
 *   3. Creates the user's associated token account
 *   4. Mints the initial supply into it
 *
 * The mint account itself is funded at a brand-new keypair we generate
 * here on the server. That keypair has to sign the create-account
 * instruction once (because we're writing to a new address), then it's
 * thrown away — the mint is forever controlled by the user's wallet as
 * authority.
 *
 * So we return:
 *   - txBase64: the unsigned tx (needs wallet + mint signatures)
 *   - mintSecret: the ephemeral mint's secret key as a number[] so the
 *     client can sign the create-account ix
 *   - mintAddress: the new mint's public key (informational)
 *
 * Security note: the ephemeral key has zero value after the tx confirms.
 * It can only sign the very specific create-account instruction we built;
 * it can't move funds. Treat it like a one-time-use nonce.
 *
 * Metaplex token metadata (so wallets display "name/symbol") is a separate
 * follow-up — Phase 10b.1.
 */
export function makeTokenLaunchTools({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return {
    prepareTokenLaunch: tool({
      description:
        "Prepare an UNSIGNED transaction to launch a brand-new SPL token on " +
        "Solana. The user's wallet becomes the mint & freeze authority and " +
        "the initial supply lands in their wallet. Use ONLY after the user " +
        "has explicitly confirmed they want to launch a token, with " +
        "specific name/symbol/decimals/supply. The UI will render an " +
        "approval card; the user must click Approve to actually sign and " +
        "submit. NOTE: wallets and explorers will show the token by its " +
        "mint address (e.g. 7xK…f2P) rather than its name/symbol until " +
        "on-chain Metaplex metadata is added (a separate future step).",
      inputSchema: z
        .object({
          name: z
            .string()
            .min(1)
            .max(32)
            .describe(
              "Human-readable token name. Stored in our preview only — " +
                "on-chain metadata (Metaplex) is a separate step. Max 32 chars."
            ),
          symbol: z
            .string()
            .min(1)
            .max(10)
            .describe("Ticker symbol, e.g. SIGNAL. Max 10 chars."),
          decimals: z
            .number()
            .int()
            .min(0)
            .max(9)
            .describe(
              "Number of decimals. 9 mirrors SOL, 6 mirrors USDC. Default 9 if unsure."
            ),
          initialSupply: z
            .number()
            .positive()
            .describe(
              "Human-readable initial supply (before decimals). E.g. 1000000 for 'one million tokens'."
            ),
        })
        .passthrough(),
      execute: async ({ name, symbol, decimals, initialSupply }) => {
        if (!walletAddress) {
          throw new Error(
            "No wallet connected. Ask the user to connect their Solana wallet first."
          );
        }
        const owner = new PublicKey(walletAddress);

        // Ephemeral mint keypair — must sign the create-account ix.
        const mint = Keypair.generate();

        const connection = new Connection(RPC_URL, "confirmed");
        const lamportsForRent = await getMinimumBalanceForRentExemptMint(
          connection
        );

        const ata = getAssociatedTokenAddressSync(mint.publicKey, owner);

        const rawSupply = BigInt(Math.round(initialSupply)) *
          BigInt(10) ** BigInt(decimals);

        const instructions = [
          // 1. Allocate space for the mint at the ephemeral address.
          SystemProgram.createAccount({
            fromPubkey: owner,
            newAccountPubkey: mint.publicKey,
            space: MINT_SIZE,
            lamports: lamportsForRent,
            programId: TOKEN_PROGRAM_ID,
          }),
          // 2. Initialize the mint with user as mint & freeze authority.
          createInitializeMint2Instruction(
            mint.publicKey,
            decimals,
            owner,
            owner
          ),
          // 3. Create the user's ATA for this mint.
          createAssociatedTokenAccountInstruction(
            owner,
            ata,
            owner,
            mint.publicKey
          ),
          // 4. Mint the initial supply to the user.
          createMintToInstruction(mint.publicKey, ata, owner, rawSupply),
        ];

        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        const message = new TransactionMessage({
          payerKey: owner,
          recentBlockhash: blockhash,
          instructions,
        }).compileToV0Message();
        const tx = new VersionedTransaction(message);
        const txBase64 = Buffer.from(tx.serialize()).toString("base64");

        const cluster = RPC_URL.includes("devnet") ? "devnet" : "mainnet";

        return {
          preview: {
            name,
            symbol,
            decimals,
            initialSupply,
            mintAddress: mint.publicKey.toBase58(),
            tokenAccount: ata.toBase58(),
            cluster,
          },
          txBase64,
          // The ephemeral mint's secret bytes. Client adds this signature
          // alongside the user's wallet signature before submitting. After
          // the tx lands, this key is useless — the user is the authority.
          mintSecret: Array.from(mint.secretKey),
        };
      },
    }),
  };
}
