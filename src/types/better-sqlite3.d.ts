declare module "better-sqlite3" {
  namespace Database {
    type RunResult = { changes: number; lastInsertRowid: number | bigint };

    interface Statement {
      run(...params: unknown[]): RunResult;
    }

    interface Database {
      exec(sql: string): this;
      pragma(source: string): unknown;
      prepare(sql: string): Statement;
      close(): void;
    }
  }

  class DatabaseImpl {
    constructor(filename: string);
    exec(sql: string): this;
    pragma(source: string): unknown;
    prepare(sql: string): Database.Statement;
    close(): void;
  }

  export = DatabaseImpl;
}
