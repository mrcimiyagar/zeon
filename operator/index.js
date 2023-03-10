
const SecurityDriver = require("./drivers/security");
const StorageDriver = require("./drivers/storage");
const NetworkDriver = require("./drivers/network");
const MemoryDriver = require("./drivers/memory");
const UpdaterDriver = require("./drivers/updater");

UpdaterDriver.initialize();
SecurityDriver.initialize();
StorageDriver.initialize(() => {
    MemoryDriver.initialize();
    NetworkDriver.initialize();
});
