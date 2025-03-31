output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "task_definition_family" {
  value = split(":", split("/", local.task_definition_arn)[1])[0]
}

output "load_balancer_url" {
  value       = aws_lb.main.dns_name
  description = "The DNS name of the load balancer"
  depends_on  = [aws_lb.main, aws_lb_listener.http]
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
  description = "The IDs of the public subnets"
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
  description = "The ID of the ALB security group"
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
  description = "The ID of the ECS security group"
}
