  import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
  } from '@solana/web3.js'
  
  export interface ValidateTransferParams {
    connection: Connection
    transaction: Transaction
    expectedRecipient: PublicKey
    expectedAmount: number // in lamports
  }
  
  /**
   * Validates a basic SOL transfer transaction:
   * - Must contain exactly one SystemProgram.transfer instruction
   * - Recipient must match the expected address
   * - Amount must match expected lamports
   */
  export async function validateTransfer({
    connection,
    transaction,
    expectedRecipient,
    expectedAmount,
  }: ValidateTransferParams): Promise<void> {
    if (!transaction) {
      throw new Error('Missing transaction')
    }
  
    const message = transaction.compileMessage()
    const { instructions, accountKeys } = message
  
    if (instructions.length !== 1) {
      throw new Error(`Transaction must contain exactly one instruction, found ${instructions.length}`)
    }
  
    const instruction = instructions[0]
    const programId = accountKeys[instruction.programIdIndex]
  
    if (!programId.equals(SystemProgram.programId)) {
      throw new Error('Instruction is not a SystemProgram.transfer')
    }
  
    const [fromIdx, toIdx] = instruction.accounts
    const recipientPubkey = accountKeys[toIdx]
    const transferData = Buffer.from(instruction.data)
  
    if (transferData.length !== 8) {
      throw new Error(`Invalid instruction data length: expected 8, got ${transferData.length}`)
    }
  
    const amount = Number(transferData.readBigUInt64LE(0))
  
    if (!recipientPubkey.equals(expectedRecipient)) {
      throw new Error(`Recipient mismatch. Expected ${expectedRecipient.toBase58()}, got ${recipientPubkey.toBase58()}`)
    }
  
    if (amount !== expectedAmount) {
      throw new Error(`Amount mismatch. Expected ${expectedAmount}, got ${amount}`)
    }
  
    // Optional: Check if transaction has already been finalized
    const signatureBytes = transaction.signatures[0]?.signature
    if (signatureBytes) {
      const signature = Buffer.from(signatureBytes).toString('base64')
      const { value } = await connection.getSignatureStatus(signature)
  
      if (value?.confirmationStatus === 'finalized') {
        throw new Error('Transaction has already been finalized')
      }
    }
  }
  