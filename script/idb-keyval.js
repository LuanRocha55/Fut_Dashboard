/* idb-keyval v6.0.3 (UMD build) */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.idbKeyval = {}));
}(this, (function (exports) {
    'use strict';

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.oncomplete = request.onsuccess = () => resolve(request.result);
            request.onabort = request.onerror = () => reject(request.error);
        });
    }
    function createStore(dbName, storeName) {
        const dbp = indexedDB.open(dbName);
        dbp.onupgradeneeded = () => dbp.result.createObjectStore(storeName);
        const requestPromise = promisifyRequest(dbp);
        return (callback) => requestPromise.then((db) => callback(db.transaction(storeName, 'readwrite').objectStore(storeName)));
    }
    let defaultGetStore;
    function getDefaultStore() {
        if (!defaultGetStore) {
            defaultGetStore = createStore('keyval-store', 'keyval');
        }
        return defaultGetStore;
    }
    function get(key, store = getDefaultStore()) {
        return store((s) => promisifyRequest(s.get(key)));
    }
    function set(key, value, store = getDefaultStore()) {
        return store((s) => promisifyRequest(s.put(value, key)));
    }
    function del(key, store = getDefaultStore()) {
        return store((s) => promisifyRequest(s.delete(key)));
    }
    function clear(store = getDefaultStore()) {
        return store((s) => promisifyRequest(s.clear()));
    }
    function keys(store = getDefaultStore()) {
        return store((s) => promisifyRequest(s.getAllKeys()));
    }

    exports.clear = clear;
    exports.createStore = createStore;
    exports.del = del;
    exports.get = get;
    exports.keys = keys;
    exports.promisifyRequest = promisifyRequest;
    exports.set = set;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
