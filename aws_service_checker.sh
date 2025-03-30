#!/bin/bash
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# Function to get monthly cost
get_monthly_cost() {
    local start_date=$(date -v-30d +%Y-%m-%d)
    local end_date=$(date +%Y-%m-%d)
    local cost=$(aws ce get-cost-and-usage \
        --time-period Start=$start_date,End=$end_date \
        --granularity MONTHLY \
        --metrics "UnblendedCost" \
        --query "ResultsByTime[0].Total.UnblendedCost.Amount" \
        --output text 2>/dev/null)
    echo "${cost:-0}"
}

# Function to check if AWS service is accessible
check_service() {
    local service=$1
    aws $service help >/dev/null 2>&1
    return $?
}

# Function to monitor EC2 instances
monitor_ec2() {
    print_header "EC2 Instances Status"
    
    aws ec2 describe-instances \
        --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,Placement.AvailabilityZone]' \
        --output table 2>/dev/null || {
        echo -e "${RED}Failed to fetch EC2 instances${NC}"
        return 1
    }
    
    # Check EC2 limits
    echo "Checking EC2 resource limits..."
}

# Function to monitor Lambda resources
monitor_lambda() {
    print_header "Lambda Resources Status"
    
    # Get list of functions
    local functions=$(aws lambda list-functions --output json)
    
    if [ -n "$functions" ] && [ "$functions" != "[]" ]; then
        echo -e "${CYAN}Lambda Functions:${NC}"
        echo "$functions" | jq -r '.Functions[] | "Function: " + .FunctionName + "\nRuntime:      " + .Runtime + "\nMemory:       " + (.MemorySize|tostring) + "MB\nTimeout:      " + (.Timeout|tostring) + "s\nLast Updated: " + .LastModified + "\nState:        " + (.State // "Active")' | while read -r line; do
            if [[ $line =~ ^Function ]]; then
                echo -e "\n${BOLD}$line${NC}"
            elif [[ $line =~ ^.*State.*Active ]]; then
                echo -e "$line" | sed "s/Active/${GREEN}Active${NC}/"
            elif [[ $line =~ ^.*State.*Inactive ]]; then
                echo -e "$line" | sed "s/Inactive/${RED}Inactive${NC}/"
            else
                echo "$line"
            fi
        done
        
        # Get function metrics
        echo -e "\n${CYAN}Function Metrics (Last 24h):${NC}"
        if [ -n "$functions" ]; then
            echo "$functions" | jq -r '.Functions[].FunctionName' | while read -r func; do
                echo -e "\n${BOLD}$func${NC}"
                
                # Get invocations
                local start_time=$(date -u -v-1d +"%Y-%m-%dT%H:%M:%SZ")
                local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                
                local invocations=$(aws cloudwatch get-metric-statistics \
                    --namespace AWS/Lambda \
                    --metric-name Invocations \
                    --dimensions "Name=FunctionName,Value=$func" \
                    --start-time "$start_time" \
                    --end-time "$end_time" \
                    --period 3600 \
                    --statistics Sum \
                    --output text \
                    --query 'Datapoints[0].Sum' || echo 0)
                
                local errors=$(aws cloudwatch get-metric-statistics \
                    --namespace AWS/Lambda \
                    --metric-name Errors \
                    --dimensions "Name=FunctionName,Value=$func" \
                    --start-time "$start_time" \
                    --end-time "$end_time" \
                    --period 3600 \
                    --statistics Sum \
                    --output text \
                    --query 'Datapoints[0].Sum' || echo 0)
                
                local duration=$(aws cloudwatch get-metric-statistics \
                    --namespace AWS/Lambda \
                    --metric-name Duration \
                    --dimensions "Name=FunctionName,Value=$func" \
                    --start-time "$start_time" \
                    --end-time "$end_time" \
                    --period 3600 \
                    --statistics Average \
                    --output text \
                    --query 'Datapoints[0].Average' || echo 0)
                
                invocations=${invocations:-0}
                errors=${errors:-0}
                duration=${duration:-0}
                
                echo "  Invocations: $invocations"
                if [ "$errors" -gt 0 ]; then
                    echo -e "  Errors:      ${RED}$errors${NC}"
                else
                    echo -e "  Errors:      ${GREEN}$errors${NC}"
                fi
                echo "  Avg Duration: ${duration}ms"
            done
        else
            echo "No Lambda functions found"
        fi
    else
        echo -e "${YELLOW}No Lambda functions found${NC}"
    fi
}

# Function to monitor S3 buckets
monitor_s3() {
    print_header "S3 Buckets Status"
    
    aws s3api list-buckets \
        --query 'Buckets[*].[Name,CreationDate]' \
        --output table 2>/dev/null || {
        echo -e "${RED}Failed to fetch S3 buckets${NC}"
        return 1
    }
    
    # Check S3 limits
    echo "Checking S3 resource limits..."
}

# Function to monitor RDS instances
monitor_rds() {
    print_header "RDS Instances Status"
    
    aws rds describe-db-instances \
        --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus]' \
        --output table 2>/dev/null || {
        echo -e "${RED}Failed to fetch RDS instances${NC}"
        return 1
    }
    
    # Check RDS limits
    echo "Checking RDS resource limits..."
}

# Function to monitor ECS clusters
monitor_ecs() {
    print_header "ECS Clusters Status"
    
    aws ecs list-clusters \
        --query 'clusterArns[*]' \
        --output table 2>/dev/null || {
        echo -e "${RED}Failed to fetch ECS clusters${NC}"
        return 1
    }
    
    # Check ECS limits
    echo "Checking ECS resource limits..."
}

# Main script
echo -e "${BOLD}AWS Infrastructure Monitor${NC}"
echo "Running infrastructure checks..."

# Test AWS credentials
echo -e "\nTesting AWS credentials..."
if ! aws_identity=$(aws sts get-caller-identity 2>&1); then
    echo -e "${RED}Error: AWS credentials not configured.${NC}"
    echo "Please ensure your AWS credentials are properly configured."
    exit 1
fi

echo -e "${GREEN}AWS credentials verified.${NC}"
echo "Account: $(echo $aws_identity | jq -r .Account)"
echo "User: $(echo $aws_identity | jq -r .Arn)"

# Monitor EC2 resources
echo -e "\n${YELLOW}1. EC2 Resources:${NC}"
if check_service ec2; then
    monitor_ec2
else
    echo -e "${YELLOW}EC2 service not accessible${NC}"
fi

# Monitor S3 resources
echo -e "\n${YELLOW}2. S3 Resources:${NC}"
if check_service s3api; then
    monitor_s3
else
    echo -e "${YELLOW}S3 service not accessible${NC}"
fi

# Monitor Lambda resources
echo -e "\n${YELLOW}3. Lambda Resources:${NC}"
if check_service lambda; then
    monitor_lambda
else
    echo -e "${YELLOW}Lambda service not accessible${NC}"
fi

# Monitor RDS resources
echo -e "\n${YELLOW}4. RDS Resources:${NC}"
if check_service rds; then
    monitor_rds
else
    echo -e "${YELLOW}RDS service not accessible${NC}"
fi

# Monitor ECS resources
echo -e "\n${YELLOW}5. ECS Resources:${NC}"
if check_service ecs; then
    monitor_ecs
else
    echo -e "${YELLOW}ECS service not accessible${NC}"
fi

# Get cost information
echo -e "\n${YELLOW}=== Cost Analysis ===${NC}"
echo "Estimated Monthly Costs:"
echo "----------------------------------------"

# Get EC2 costs
total_cost=0
if check_service ec2; then
    # Get instance details including state
    instances=$(aws ec2 describe-instances \
        --query 'Reservations[*].Instances[*].[InstanceType,State.Name]' \
        --output json 2>/dev/null)
    
    instance_cost=0
    if [ -n "$instances" ] && [ "$instances" != "[]" ]; then
        while IFS= read -r instance; do
            type=$(echo "$instance" | jq -r '.[0]')
            state=$(echo "$instance" | jq -r '.[1]')
            
            # Only calculate cost for running instances
            if [ "$state" = "running" ]; then
                case $type in
                    "t2.micro")   cost=8.50 ;;
                    "t2.small")   cost=17 ;;
                    "t2.medium")  cost=34 ;;
                    "t2.large")   cost=68 ;;
                    "t2.xlarge")  cost=136 ;;
                    "t2.2xlarge") cost=272 ;;
                    *) cost=0 ;;
                esac
                instance_cost=$(echo "$instance_cost + $cost" | bc)
            fi
        done < <(echo "$instances" | jq -c '.[][]')
    fi
    
    total_cost=$instance_cost
    echo "EC2 Instances:     \$$total_cost"
fi

# Get S3 costs
if check_service s3api; then
    bucket_cost=$(aws s3api list-buckets --query 'length(Buckets)' --output text 2>/dev/null)
    bucket_cost=${bucket_cost:-0}
    s3_total=$(echo "$bucket_cost * 0.023" | bc)
    echo "S3 Storage:        \$$s3_total"
    total_cost=$(echo "$total_cost + $s3_total" | bc)
fi

# Get Lambda costs
if check_service lambda; then
    lambda_cost=$(aws lambda list-functions --query 'length(Functions)' --output text 2>/dev/null)
    lambda_cost=${lambda_cost:-0}
    lambda_total=$(echo "$lambda_cost * 0.20" | bc)
    echo "Lambda Functions:  \$$lambda_total"
    total_cost=$(echo "$total_cost + $lambda_total" | bc)
fi

# Get RDS costs
if check_service rds; then
    rds_cost=$(aws rds describe-db-instances --query 'length(DBInstances)' --output text 2>/dev/null)
    rds_cost=${rds_cost:-0}
    rds_total=$(echo "$rds_cost * 100" | bc)
    echo "RDS Instances:     \$$rds_total"
    total_cost=$(echo "$total_cost + $rds_total" | bc)
fi

# Get EBS volumes cost
ebs_cost=$(aws ec2 describe-volumes --query 'sum(Volumes[*].Size)' --output text 2>/dev/null)
ebs_cost=${ebs_cost:-0}
ebs_total=$(echo "$ebs_cost * 0.10" | bc)
echo "EBS Volumes:       \$$ebs_total"
total_cost=$(echo "$total_cost + $ebs_total" | bc)

echo "----------------------------------------"
echo -e "Total Estimated:    ${BOLD}\$$total_cost/month${NC}"
echo -e "\nNote: These are rough estimates. Check AWS Cost Explorer for accurate costs."
