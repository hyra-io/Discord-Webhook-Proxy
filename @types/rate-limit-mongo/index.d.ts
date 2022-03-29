/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'rate-limit-mongo' {
    export interface MongoStoreOptions {
        uri: string;
        collectionName?: string;
        expireTimeMs?: number;
        resetExpireDateOnChange?: boolean;
        errorHandler?: (err: Error) => void;
        createTtlIndex?: boolean;
    }
    declare class MongoStore {
        constructor(options: MongoStoreOptions);

        incr: (key: string, callback: (...args: any[]) => void) => void;

        decrement: (key: string, callback?: (...args: any[]) => void) => void;

        resetKey: (key: string, callback?: (...args: any[]) => void) => void;

        resetAll: () => void;
    }
    export default MongoStore;
}