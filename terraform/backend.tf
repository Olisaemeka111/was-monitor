# Configure S3 backend with DynamoDB state locking
terraform {
  backend "s3" {
    bucket         = "aws-monitor-tf-state-156041437006"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "aws-monitor-tf-lock-156041437006"
    encrypt        = true
  }
}
