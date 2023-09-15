const pulumi = require("@pulumi/pulumi");
const docker = require("@pulumi/docker");
const awsx = require("@pulumi/awsx");
const aws = require("@pulumi/aws");

// Create an ECS cluster
const cluster = new awsx.ecs.Cluster("custom");

// Build and publish the first image to ECR
function createDockerImage(dir, repoName) {
    const createEcrRepo = new aws.ecr.Repository(dir);
    const image = new docker.Image(repoName, {
        imageName: pulumi.interpolate`${createEcrRepo.repositoryUrl}:v1.0.0`,
        build: `../${dir}`,
    });

    return image
}

// Create a Fargate service task that uses the images deployed to ECR
let service = new awsx.ecs.EC2Service("GS1-Digital-Link", {
    cluster: cluster,
    taskDefinitionArgs: {
        containers: {
            frontendProxyServer: {
                image: frontendProxyServer.imageName,
                memory: 512,
                portMappings: [ { containerPort: 80 } ],
            },
            dataEntryServer: {
                image: dataEntryServer.imageName,
                memory: 512,
            },
            digitallinkToolkitServer: {
                image: digitallinkToolkitServer.imageName,
                memory: 512,
            },
            webServer: {
                image: webServer.imageName,
                memory: 512,
            },
            dashboardSyncServer: {
                image: dashboardSyncServer.imageName,
                memory: 512,
            },
            buildSyncServer: {
                image: buildSyncServer.imageName,
                memory: 512,
            },
        },
    },
    desiredCount: 6,  // Run 6 instances of the service
});

// Export stack outputs
exports.clusterId = cluster.cluster.id;
exports.frontendProxyServer = createDockerImage(`frontend-proxy-serve`, "frontend-proxy-server").imageName;
exports.dataEntryServer = createDockerImage(`resolver_data_entry_server`, "data-entry-server").imageName;
exports.digitallinkToolkitServer = createDockerImage(`digitallink_toolkit_server`, "digitallink_toolkit_server").imageName;
exports.webServer = createDockerImage(`resolver_web_server`, "resolver_web_server").imageName;
exports.dashboardSyncServer = createDockerImage(`dashboard_sync_server`, "dashboard_sync_server").imageName;
exports.buildSyncServer = createDockerImage(`build_sync_server`, "build_sync_server").imageName;
exports.serviceId = service.service.id;
exports.serviceUrl = service.url;
