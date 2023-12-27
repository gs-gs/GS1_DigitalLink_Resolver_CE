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

// Create an RDS instance with SQL Server if it doesn't already exist
const sqlInstanceAddress = aws.rds
  .getInstance({ dbInstanceIdentifier: DB_INSTANCE_IDENTIFIER })
  .then((instance) => {
    // If the instance doesn't exist, create it
    let sqlInstanceAddress = instance.address;
    if (!instance || pulumi.getStack().includes('farm')) {
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
      });
      sqlInstance.address.apply((address) => (sqlInstanceAddress = address));
    }
    return sqlInstanceAddress;
  });

export { sqlInstanceAddress };
