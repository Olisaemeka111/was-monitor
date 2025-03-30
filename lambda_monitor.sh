monitor_lambda() {
    print_header "Lambda Resources Status"
    
    # Get list of functions
    local functions=$(aws lambda list-functions --output json)
    
    if [ -n "$functions" ] && [ "$functions" != "[]" ]; then
        echo -e "${CYAN}Lambda Functions:${NC}"
        echo "$functions" | jq -r '.Functions[] | "Function: \(.FunctionName)\n  Runtime:      \(.Runtime)\n  Memory:       \(.MemorySize)MB\n  Timeout:      \(.Timeout)s\n  Last Updated: \(.LastModified)\n  State:        \(.State // \"Active\")"' | while read -r line; do
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
