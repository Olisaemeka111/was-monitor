# AWS Monitor - Deployment and Operation Procedure

## Initial Setup

### 1. Local Development Setup

1. System Requirements:
   ```
   - Node.js 18+
   - npm 8+
   - Git
   - AWS CLI v2
   - Terraform 1.0+
   - Docker Desktop
   ```

2. Clone and Configure Repository:
   ```bash
   git clone https://github.com/yourusername/aws-monitor.git
   cd aws-monitor
   npm install
   ```

3. Configure Environment:
   ```bash
   # Create .env.local file
   cat > .env.local << EOL
   AWS_REGION=us-east-1
   EOL
   ```

### 2. AWS Infrastructure Setup

1. Configure AWS CLI:
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter default region (us-east-1)
   # Enter output format (json)
   ```

2. Deploy Infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform plan    # Review the changes
   terraform apply   # Deploy the infrastructure
   ```

3. Note the outputs:
   - ECR Repository URL
   - ECS Cluster name
   - DynamoDB table name

### 3. GitHub Repository Setup

1. Create GitHub Repository:
   - Go to GitHub
   - Create a new repository
   - Push your code to the repository

2. Configure GitHub Secrets:
   - Go to Repository Settings > Secrets
   - Add the following secrets:
     ```
     AWS_ACCESS_KEY_ID
     AWS_SECRET_ACCESS_KEY
     ```

## Deployment

### 1. Local Development Deployment

1. Start Development Server:
   ```bash
   npm run dev
   ```

2. Access the application:
   - Open browser: http://localhost:4000
   - Test the application locally

### 2. Docker Deployment

1. Build Docker Image:
   ```bash
   docker build -t aws-monitor .
   ```

2. Run Container:
   ```bash
   docker run -p 4000:4000 aws-monitor
   ```

3. Access the application:
   - Open browser: http://localhost:4000

### 3. Production Deployment (ECS)

1. Prepare for deployment:
   - Ensure all changes are committed
   - Create a pull request to main branch
   - Review Terraform plan in pull request comments
   - Get approval and merge PR

2. Automated Deployment Process:
   - GitHub Actions workflow is triggered on merge to main
   - Terraform applies infrastructure changes:
     ```
     - VPC and networking setup
     - ECS cluster and service
     - Load balancer configuration
     - Auto-scaling policies
     - CloudWatch alarms
     ```
   - Docker image is built and pushed to ECR
   - ECS service is updated with new task definition

3. Verify Deployment:
   - Check GitHub Actions workflow progress
   - Monitor ECS service status
   - Verify CloudWatch alarms
   - Test application through load balancer

4. Rollback Procedure (if needed):
   - Revert the merge in GitHub
   - Previous version will be automatically deployed
   - Or manually rollback Terraform changes:
     ```bash
     cd terraform
     terraform plan -destroy    # Review destruction plan
     terraform destroy         # Remove all infrastructure
     git checkout <previous-commit>
     terraform init
     terraform apply          # Recreate previous infrastructure
     ```
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Monitor GitHub Actions:
   - Go to repository's Actions tab
   - Watch the deployment progress

3. Access the application:
   - Use the ECS service URL (available in AWS Console)

## Operation

### 1. Adding AWS Accounts

1. Access the application
2. Click "Add Account"
3. Provide:
   - Account Name
   - AWS Credentials file (.csv format)
4. Submit the form

### 2. Monitoring Accounts

1. From the dashboard:
   - Select an account to monitor
   - Click "Monitor" button
2. View:
   - EC2 instances
   - Lambda functions
   - S3 buckets
   - RDS instances
   - Cost analysis

### 3. Managing Accounts

1. View Accounts:
   - Go to Accounts page
   - See list of all configured accounts

2. Delete Account:
   - Click "Delete" button next to account
   - Confirm deletion

### 4. Troubleshooting

1. Check Logs:
   ```bash
   # View ECS logs
   aws logs get-log-events --log-group-name /ecs/aws-monitor

   # View container logs
   docker logs aws-monitor
   ```

2. Common Issues:
   - Credential errors: Check AWS credentials
   - Access denied: Verify IAM permissions
   - Connection issues: Check network/firewall settings

## Maintenance

### 1. Regular Updates

1. Update Dependencies:
   ```bash
   npm update
   npm audit fix
   ```

2. Update Infrastructure:
   ```bash
   cd terraform
   terraform plan
   terraform apply
   ```

### 2. Backup and Recovery

1. DynamoDB Backup:
   - Automatic backups are enabled
   - Manual backup:
     ```bash
     aws dynamodb create-backup --table-name aws-monitor-accounts
     ```

2. Application Backup:
   - Code is version controlled in Git
   - Infrastructure is defined in Terraform

### 3. Monitoring

1. Application Health:
   - Check ECS service status
   - Monitor CloudWatch metrics
   - Review application logs

2. Security:
   - Regular dependency updates
   - Container image scanning
   - AWS credential rotation

## Support

For issues or questions:
1. Check the GitHub repository issues
2. Review AWS ECS and DynamoDB documentation
3. Contact the development team

---

Last Updated: March 2025
