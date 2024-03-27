import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
require('dotenv').config();

// // Load the config object
const config = new pulumi.Config();
// Load the ports from the config
const SQL_SERVER_USERNAME = process.env.SQL_SERVER_USERNAME!;
const SQL_SERVER_PASSWORD = process.env.SQL_SERVER_PASSWORD!;
const SQL_SERVER_PORT = +process.env.SQL_SERVER_PORT!;
const DB_INSTANCE_IDENTIFIER = process.env.DB_INSTANCE_IDENTIFIER!;
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID!;
const SNAPSHOT_IDENTIFIER = process.env.SNAPSHOT_IDENTIFIER!;

const getRDSInstance = async () => {
  try {
    const instance = await aws.rds.getInstance({
      dbInstanceIdentifier: DB_INSTANCE_IDENTIFIER,
    });
    return instance;
  } catch (error) {
    return null;
  }
};

// Create an RDS instance with SQL Server if it doesn't already exist
const sqlInstanceAddress = getRDSInstance().then((instance) => {
  // If the instance doesn't exist, create it
  let sqlInstanceAddress = instance?.address;
  if (!instance || pulumi.getStack().includes('test')) {
    const sqlInstance = new aws.rds.Instance('sql-server', {
      engine: 'sqlserver-ex', // Use SQL Server Express edition
      instanceClass: 'db.t3.micro',
      allocatedStorage: 20, // GB
      username: SQL_SERVER_USERNAME,
      password: SQL_SERVER_PASSWORD,
      port: SQL_SERVER_PORT,
      skipFinalSnapshot: true,
      publiclyAccessible: true,
      identifier: DB_INSTANCE_IDENTIFIER,
      snapshotIdentifier: SNAPSHOT_IDENTIFIER,
    });

    const record = new aws.route53.Record('sql-server-dns', {
      name: 'dlr-sql-server',
      zoneId: HOSTED_ZONE_ID,
      type: 'CNAME',
      ttl: 300,
      records: [sqlInstance.address],
    });

    record.fqdn.apply((fqdn) => {
      sqlInstanceAddress = fqdn;
    });
  }

  return sqlInstanceAddress;
});

export { sqlInstanceAddress };
