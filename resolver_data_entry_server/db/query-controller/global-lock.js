const sql = require('mssql');
const { makeDBConnectionAndPS } = require('../dbUtils');
const utils = require('../../bin/resolver_utils');

// function for getting the global lock for write operation
const getGlobalWritingLock = async () => {
  try {
    const ps = await makeDBConnectionAndPS();
    await ps.prepare("select * from global_locks where name = 'write'");
    const queryResponse = await ps.execute({});
    utils.logThis('Successfully fetch global lock from DB');
    await ps.unprepare();

    return queryResponse.recordset;
  } catch (error) {
    utils.logThis('Error to connect DB for getting global_locks');
  }
};

// DB query to r

module.exports = {
  getGlobalWritingLock,
};
