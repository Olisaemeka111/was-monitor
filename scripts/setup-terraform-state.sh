#!/bin/bash

# Create S3 bucket for Terraform state
aws s3api create-bucket \
    --bucket aws-monitor-terraform-state \
    --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket aws-monitor-terraform-state \
    --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket aws-monitor-terraform-state \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
    --table-name terraform-state-lock \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --region us-east-1

echo "Terraform state storage has been configured:"
echo "- S3 bucket: aws-monitor-terraform-state"
echo "- DynamoDB table: terraform-state-lock"
