import { Connection, SendOptions, Signer, Transaction, TransactionCtorFields, TransactionInstruction } from "@solana/web3.js";

export interface TransactionBuilderRecord {
  key?: string;
  instruction: TransactionInstruction;
  signers: Signer[];
}

export class TransactionBuilder {

  /** The list of all instructions and their respective signers. */
  private records: TransactionBuilderRecord[] = [];

  /** Options used when building the transaction. */
  private transactionOptions: TransactionCtorFields;

  constructor(transactionOptions: TransactionCtorFields = {}) {
    this.transactionOptions = transactionOptions;
  }

  static make(transactionOptions: TransactionCtorFields = {}) {
    return new TransactionBuilder(transactionOptions);
  }

  prepend(...txs: (TransactionBuilderRecord | TransactionBuilder)[]): TransactionBuilder {
    const newRecords = txs.flatMap(tx => tx instanceof TransactionBuilder ? tx.getRecords() : [tx]);
    this.records = [...newRecords, ...this.records];

    return this;
  }

  append(...txs: (TransactionBuilderRecord | TransactionBuilder)[]): TransactionBuilder {
    const newRecords = txs.flatMap(tx => tx instanceof TransactionBuilder ? tx.getRecords() : [tx]);
    this.records = [...this.records, ...newRecords];

    return this;
  }

  add(...txs: (TransactionBuilderRecord | TransactionBuilder)[]): TransactionBuilder {
    return this.append(...txs);
  }

  splitUsingKey(key: string, include: boolean = true): [TransactionBuilder, TransactionBuilder] {
    const firstBuilder = new TransactionBuilder(this.transactionOptions);
    const secondBuilder = new TransactionBuilder(this.transactionOptions);
    let keyPosition = this.records.findIndex(record => record.key === key)

    if (keyPosition > -1) {
      keyPosition += include ? 1 : 0; 
      firstBuilder.add(...this.records.slice(0, keyPosition))
      firstBuilder.add(...this.records.slice(keyPosition))
    } else {
      firstBuilder.add(this)
    }

    return [firstBuilder, secondBuilder];
  }

  splitBeforeKey(key: string): [TransactionBuilder, TransactionBuilder] {
    return this.splitUsingKey(key, false);
  }

  splitAfterKey(key: string): [TransactionBuilder, TransactionBuilder] {
    return this.splitUsingKey(key, true);
  }

  getRecords(): TransactionBuilderRecord[] {
    return this.records;
  }

  getInstructions(): TransactionInstruction[] {
    return this.records.map(record => record.instruction);
  }

  getSigners(): Signer[] {
    // Duplicated signers are handled by the Solana SDK.
    return this.records.flatMap(record => record.signers);
  }

  setTransactionOptions(transactionOptions: TransactionCtorFields): TransactionBuilder {
    this.transactionOptions = transactionOptions;

    return this;
  }

  getTransactionOptions() {
    return this.transactionOptions;
  }

  toTransaction(): Transaction {
    const tx = new Transaction(this.getTransactionOptions());
    tx.add(...this.getInstructions());

    return tx;
  }

  async sendTransaction(connection: Connection, signers: Signer[] = [], sendOptions: SendOptions = {}): Promise<string> {
    signers = [...this.getSigners(), ...signers];

    return connection.sendTransaction(this.toTransaction(), signers, sendOptions)
  }
}