const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Create a VPC and a public subnet within the VPC
const vpc = new aws.ec2.Vpc("gs1_digitallink_vpc", { cidrBlock: "10.0.0.0/16" });
const subnet = new aws.ec2.Subnet("gs1_digitallink_subnet", { cidrBlock: "10.0.1.0/24", vpcId: vpc.id });

// Load the config object
const config = new pulumi.Config();
// Load the ports from the config
const SQL_SERVER_PORT = config.require('SQL_SERVER_PORT') || 1433;
const MONGODB_PORT = config.require('MONGODB_PORT') || 27017;

// Create a security group that allows external access to our SQL Server and MongoDB
const sg = new aws.ec2.SecurityGroup("gs1_digitallink_sg", {
    vpcId: vpc.id,
    ingress: [
        { protocol: "tcp", fromPort: SQL_SERVER_PORT, toPort: SQL_SERVER_PORT, cidrBlocks: ["0.0.0.0/0"] }, // SQL Server
        { protocol: "tcp", fromPort: MONGODB_PORT, toPort: MONGODB_PORT, cidrBlocks: ["0.0.0.0/0"] }, // MongoDB
    ]
});

// Create an RDS instance with SQL Server
const sql = new aws.rds.Instance("gs1_digitallink_sql", {
    engine: "sqlserver-ex", // Use SQL Server Express edition
    instanceClass: "db.t2.micro",
    allocatedStorage: 20, // GB
    masterUsername: config.require('AWS_SQL_SERVER_USERNAME'),
    masterPassword: config.require('AWS_SQL_SERVER_PASSWORD'), 
    vpcSecurityGroupIds: [sg.id],
    dbSubnetGroupName: subnet.id,
});

// Create a DocumentDB (MongoDB) instance
const mongo = new aws.docdb.Cluster("gs1_digitallink_mongo", {
    masterUsername: config.require('AWS_MONGO_DB_USERNAME'),
    masterPassword: config.require('AWS_MONGO_DB_PASSWORD'), 
    skipFinalSnapshot: true,
    dbSubnetGroupName: subnet.id,
    vpcSecurityGroupIds: [sg.id],
    storageEncrypted: true
});

// Export the connection settings for each database as stack outputs
exports.vpcId = vpc.id;
exports.subnetId = subnet.id;
exports.securityGroupId = sg.id;
exports.sqlEndpoint = sql.endpoint;
exports.mongoEndpoint = mongo.endpoint;
