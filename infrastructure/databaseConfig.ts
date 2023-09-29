import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
require('dotenv').config();

// // Load the config object
const config = new pulumi.Config();
// Load the ports from the config
const SQL_SERVER_USERNAME = process.env.SQL_SERVER_USERNAME!;
const SQL_SERVER_PASSWORD = process.env.SQL_SERVER_PASSWORD!;
const SQL_SERVER_DB = process.env.SQL_SERVER_DATABASE!;
const SQL_SERVER_PORT = +process.env.SQL_SERVER_PORT!;
// const MONGODB_PORT = +process.env.AWS_DOCDB_PORT!;
// const MONGO_DB_USERNAME = process.env.AWS_DOCDB_USERNAME!;
// const MONGO_DB_PASSWORD = process.env.AWS_DOCDB_PASSWORD!;

// // Create an RDS instance with SQL Server
const sqlInstance = new aws.rds.Instance('sql-server', {
  engine: 'sqlserver-ex', // Use SQL Server Express edition
  instanceClass: 'db.t3.micro',
  allocatedStorage: 20, // GB
  username: SQL_SERVER_USERNAME,
  password: SQL_SERVER_PASSWORD,
  port: SQL_SERVER_PORT,
  skipFinalSnapshot: true,
  publiclyAccessible: true,
});

// // Create a DocumentDB (MongoDB) instance
// const docdbCluster = new aws.docdb.Cluster('resolver-mongo-server', {
//   masterUsername: MONGO_DB_USERNAME,
//   masterPassword: MONGO_DB_PASSWORD,
//   port: MONGODB_PORT,
//   skipFinalSnapshot: true,
// });

export { sqlInstance };
