# AWS Monitor

A web application for monitoring multiple AWS accounts' resources and costs. The application allows users to upload AWS credentials, securely store them, and monitor various AWS services including EC2, Lambda, S3, RDS, and ECS.

## Features

- Multi-account AWS monitoring
- Secure credential management
- Resource monitoring for:
  - EC2 instances
  - Lambda functions
  - S3 buckets
  - RDS instances
  - ECS clusters
- Cost analysis and estimation
- Containerized deployment
- CI/CD pipeline with GitHub Actions

## Prerequisites

- Node.js 18 or higher
- AWS Account with appropriate permissions
- Docker (for containerized deployment)
- Terraform (for infrastructure deployment)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aws-monitor.git
cd aws-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
AWS_REGION=us-east-1
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:4000

## Deployment Guide

### 1. Repository Setup

1. Create a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/Olisaemeka111/was-monitor.git
   git push -u origin main
   ```

2. Configure GitHub repository settings:
   - Go to Settings > Secrets and variables > Actions
   - Add the following repository secrets:
     ```
     AWS_ACCESS_KEY_ID         # Your AWS access key
     AWS_SECRET_ACCESS_KEY     # Your AWS secret key
     ```

### 2. AWS Setup

1. Create an AWS IAM user for deployments:
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach policies:
     ```
     AmazonECS_FullAccess
     AmazonECR_FullAccess
     AmazonVPCFullAccess
     AmazonDynamoDBFullAccess
     CloudWatchFullAccess
     AmazonS3FullAccess        # For Terraform state
     ```
   - Save the access key and secret key

2. Configure AWS CLI locally:
   ```bash
   aws configure
   # Enter your AWS credentials and set region to us-east-1
   ```

### 3. Infrastructure Deployment

The infrastructure is automatically deployed through the GitHub Actions pipeline when you push to the main branch. The pipeline will:

1. Initialize Terraform with remote state storage
2. Generate and display a Terraform plan
3. Apply the infrastructure changes

This creates:
- VPC with public subnets
- ECS cluster
- ECR repository
- Load balancer
- DynamoDB table
- CloudWatch alarms

To deploy:
1. Push your code to the main branch:
   ```bash
   git push origin main
   ```
2. Go to GitHub Actions tab to monitor the deployment
3. The load balancer URL will be displayed in the workflow output

### 4. Pipeline Execution

The entire deployment is handled by the GitHub Actions pipeline. When you push to main:

1. Infrastructure Phase:
   - Terraform initializes with remote state
   - Infrastructure plan is generated
   - Infrastructure is created/updated
   - Outputs (like load balancer URL) are saved

2. Application Phase:
   - Docker image is built
   - Image is pushed to ECR
   - ECS service is updated
   - Health checks run automatically

To trigger a deployment:
```bash
git add .
git commit -m "Update application code"
git push origin main
```

Monitor the process in GitHub Actions tab

3. Verify deployment:
   - Wait for the GitHub Actions workflow to complete
   - Check the workflow logs for the application URL
   - Visit the URL to ensure the application is running
   - Test key endpoints:
     - Root endpoint (/)
     - Accounts endpoint (/api/accounts)
     - Metrics endpoint (/api/metrics)

### 5. Post-Deployment

1. Monitor the application:
   - Check CloudWatch metrics
   - Review ECS service status
   - Verify auto-scaling settings

2. Backup and security:
   - Enable AWS backup for DynamoDB
   - Review security group rules
   - Check CloudWatch alarms

3. Maintenance:
   - Regularly update dependencies
   - Monitor AWS costs
   - Review application logs

### Using Docker Locally

1. Build the Docker image:
```bash
docker build -t aws-monitor .
```

2. Run the container:
```bash
docker run -p 4000:4000 aws-monitor
```

The application will be available at http://localhost:4000

## Architecture

- Frontend: Next.js
- Backend: Node.js with Next.js API routes
- Database: Amazon DynamoDB
- Container: Docker
- Orchestration: AWS ECS
- CI/CD: GitHub Actions
- Infrastructure: Terraform

## Security

- AWS credentials are stored securely in DynamoDB with encryption at rest
- Temporary credentials are used only during active monitoring
- HTTPS encryption in transit
- IAM roles with least privilege principle
- Regular security scanning of container images

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
