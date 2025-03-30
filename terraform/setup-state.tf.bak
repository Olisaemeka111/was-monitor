locals {
  state_bucket = "aws-monitor-tf-state-${data.aws_caller_identity.current.account_id}"
  state_lock_table = "aws-monitor-tf-lock-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "terraform_state" {
  bucket = local.state_bucket
  force_destroy = true

  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = local.state_lock_table
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

output "state_bucket" {
  value = aws_s3_bucket.terraform_state.bucket
}

output "state_lock_table" {
  value = aws_dynamodb_table.terraform_state_lock.name
}
