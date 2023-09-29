import * as pulumi from '@pulumi/pulumi';
import * as awsx from '@pulumi/awsx';
import * as aws from '@pulumi/aws';
import { ApplicationLoadBalancerArgs } from '@pulumi/awsx/lb';
import { sqlInstance } from './databaseConfig';
require('dotenv').config();

const createLoadBalancerWithDomain = (
  name: string,
  loadBalancerArgs: ApplicationLoadBalancerArgs,
  { record, zoneId }: { record: string; zoneId: string }
) => {
  const loadbalancer = new awsx.lb.ApplicationLoadBalancer(
    name,
    loadBalancerArgs
  );

  new aws.route53.Record('dlr-route53-record', {
    name: record,
    type: 'A',
    zoneId: zoneId,
    aliases: [
      {
        name: loadbalancer.loadBalancer.dnsName,
        zoneId: loadbalancer.loadBalancer.zoneId,
        evaluateTargetHealth: true,
      },
    ],
  });

  const certificate = new aws.acm.Certificate('dlr-certificate', {
    domainName: record,
    validationMethod: 'DNS',
  });

  const certValidation = new aws.route53.Record('certValidation', {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: 60,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    zoneId: zoneId,
  });

  new aws.acm.CertificateValidation('cert', {
    certificateArn: certificate.arn,
    validationRecordFqdns: [certValidation.fqdn],
  });

  new aws.lb.Listener('listener', {
    loadBalancerArn: loadbalancer.loadBalancer.arn,
    port: 443,
    protocol: 'HTTPS',
    certificateArn: certificate.arn,
    defaultActions: [
      {
        type: 'forward',
        targetGroupArn: loadbalancer.defaultTargetGroup.arn,
      },
    ],
  });

  return loadbalancer;
};

const createImage = (repoName: string) => {
  const repo = new awsx.ecr.Repository(`${repoName}-repo`, {
    forceDelete: true,
  });
  const image = new awsx.ecr.Image(`${repoName}-image`, {
    repositoryUrl: repo.url,
    path: `../${repoName}`,
  });

  return image;
};

const createServerService = (sqlAddress: string) => {
  const config = new pulumi.Config();
  const containerPort = config.getNumber('containerPort') || 80;
  const cpu = config.getNumber('cpu') || 256;
  const memory = config.getNumber('memory') || 512;
  const sqlMemory = memory * 2;

  // Create an ECS cluster
  const cluster = new aws.ecs.Cluster('gs1-digital-link-ecs', {});

  // Build and publish the first image to ECR

  const frontendProxyServer = createImage('frontend_proxy_server');
  const dataEntryServer = createImage('resolver_data_entry_server');
  const digitallinkToolkitServer = createImage('digitallink_toolkit_server');
  const resolverWebServer = createImage('resolver_web_server');
  // const dashboardSyncServer = createImage('dashboard_sync_server');
  const buildSyncServer = createImage('build_sync_server');
  const resolverMongoServer = createImage('resolver_mongo_server');
  // const resolverSqlServer = createImage('resolver_sql_server');
  const SQL_SERVER_USERNAME = process.env.SQL_SERVER_USERNAME!;
  const SQL_SERVER_PASSWORD = process.env.SQL_SERVER_PASSWORD!;
  const SQL_SERVER_DB = process.env.SQL_SERVER_DATABASE!;
  const SQL_SERVER_PORT = +process.env.SQL_SERVER_PORT!;
  const MONGO_DB_PORT = +process.env.MONGO_PORT!;
  const MONGO_DB_USERNAME = process.env.MONGO_USERNAME!;
  const MONGO_DB_PASSWORD = process.env.MONGO_PASSWORD!;
  const DLR_RECORD = process.env.DLR_RECORD!;
  const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID!;
  const MONGO_CONN = `mongodb://${MONGO_DB_USERNAME}:${MONGO_DB_PASSWORD}@localhost:${MONGO_DB_PORT}/?authSource=admin&readPreference=primary&directConnection=true&ssl=false`;

  // An ALB to serve the container endpoint to the internet
  const loadbalancer = createLoadBalancerWithDomain(
    'loadbalancer',
    {
      defaultTargetGroup: {
        healthCheck: { path: '/ui/index.html', interval: 300 },
      },
    },
    { record: DLR_RECORD, zoneId: HOSTED_ZONE_ID }
  );

  // Create a Fargate service task that uses the images deployed to ECR
  new awsx.ecs.FargateService('GS1-Digital-Link', {
    cluster: cluster.arn,
    assignPublicIp: true,
    taskDefinitionArgs: {
      containers: {
        resolverMongoService: {
          image: resolverMongoServer.imageUri,
          essential: true,
          cpu: cpu,
          memory: memory,
          name: 'resolver-mongo-service',
          portMappings: [{ containerPort: MONGO_DB_PORT }],
          environment: [
            { name: 'MONGO_INITDB_ROOT_USERNAME', value: MONGO_DB_USERNAME },
            { name: 'MONGO_INITDB_ROOT_PASSWORD', value: MONGO_DB_PASSWORD },
          ],
        },
        // resolverSqlService: {
        //   image: resolverSqlServer.imageUri,
        //   cpu: cpu,
        //   memory: sqlMemory,
        //   essential: true,
        //   name: 'resolver-sql-service',
        //   portMappings: [{ containerPort: SQL_SERVER_PORT }],
        //   environment: [
        //     { name: 'MSSQL_SA_PASSWORD', value: SQL_SERVER_PASSWORD },
        //     { name: 'MSSQL_PID', value: 'Developer' },
        //     { name: 'MSSQL_LCID', value: '1033' },
        //     { name: 'MSSQL_MEMORY_LIMIT_MB', value: '1024' },
        //     { name: 'MSSQL_AGENT_ENABLED', value: 'true' },
        //     { name: 'ACCEPT_EULA', value: 'Y' },
        //     { name: 'DEBIAN_FRONTEND', value: 'noninteractive' },
        //     { name: 'TZ', value: 'Europe/London' },
        //   ],
        //   command: ['/opt/mssql-tools/bin/sqlcmd'],
        // },
        frontendProxyService: {
          image: frontendProxyServer.imageUri,
          essential: true,
          cpu: cpu,
          memory: memory,
          portMappings: [
            {
              containerPort: containerPort,
              targetGroup: loadbalancer.defaultTargetGroup,
            },
          ],
          name: 'frontend-proxy-service',
          dependsOn: [{ containerName: 'idService', condition: 'START' }],
        },
        dataEntryService: {
          image: dataEntryServer.imageUri,
          essential: true,
          cpu: cpu,
          memory: memory,
          name: 'data-entry-service',
          environment: [
            { name: 'SQLDBCONN_USER', value: SQL_SERVER_USERNAME },
            { name: 'SQLDBCONN_PASSWORD', value: SQL_SERVER_PASSWORD },
            { name: 'SQLDBCONN_SERVER', value: sqlAddress },
            { name: 'SQLDBCONN_DB', value: SQL_SERVER_DB },
            { name: 'PORT', value: '3000' },
          ],
        },
        digitallinkToolkitService: {
          image: digitallinkToolkitServer.imageUri,
          essential: false,
          cpu: cpu,
          memory: memory,
          name: 'digitallink-toolkit-service',
          environment: [{ name: 'PORT', value: '3001' }],
        },
        idService: {
          image: resolverWebServer.imageUri,
          essential: true,
          cpu: cpu,
          memory: memory,
          name: 'id-service',
          environment: [
            { name: 'PORT', value: '3002' },
            { name: 'MONGODBCONN', value: MONGO_CONN },
          ],
        },
        // dashboardSyncService: {
        //   image: dashboardSyncServer.imageUri,
        //   cpu: cpu,
        //   memory: memory,
        //   name: 'dashboard-sync-service',
        //   environment: [
        //     { name: 'SQLDBCONN_USER', value: SQL_SERVER_USERNAME },
        //     { name: 'SQLDBCONN_PASSWORD', value: SQL_SERVER_PASSWORD },
        //     { name: 'SQLDBCONN_SERVER', value: sqlAddress },
        //     { name: 'SQLDBCONN_DB', value: SQL_SERVER_DB },
        //     { name: 'MONGODBCONN', value: MONGO_CONN },
        //     { name: 'BUILD_HOSTNAME', value: 'dashboard_job' },
        //     { name: 'DOCKER_COMPOSE_RUN', value: 'Y' },
        //     { name: 'DOCKER_RUN_INTERVAL_SECS', value: '120' },
        //     { name: 'PORT', value: '3003' },
        //   ],
        //   dependsOn: [
        //     { containerName: 'resolverMongoService', condition: 'START' },
        //   ],
        // },
        buildSyncService: {
          image: buildSyncServer.imageUri,
          essential: false,
          cpu: cpu,
          memory: memory,
          name: 'build-sync-service',
          environment: [
            { name: 'SQLDBCONN_USER', value: SQL_SERVER_USERNAME },
            { name: 'SQLDBCONN_PASSWORD', value: SQL_SERVER_PASSWORD },
            { name: 'SQLDBCONN_SERVER', value: sqlAddress },
            { name: 'SQLDBCONN_DB', value: SQL_SERVER_DB },
            { name: 'MONGODBCONN', value: MONGO_CONN },
            { name: 'BUILD_HOSTNAME', value: 'build_job' },
            { name: 'DOCKER_COMPOSE_RUN', value: 'Y' },
            { name: 'DOCKER_RUN_INTERVAL_SECS', value: '60' },
            { name: 'PORT', value: '3004' },
          ],
          dependsOn: [
            { containerName: 'resolverMongoService', condition: 'START' },
          ],
        },
      },
    },
    desiredCount: 1,
  });
};

pulumi.all([sqlInstance.address]).apply(([sqlAddress]) => {
  createServerService(sqlAddress);
});
