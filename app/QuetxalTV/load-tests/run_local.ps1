$HostUrl = $env:LOCUST_HOST

if ([string]::IsNullOrWhiteSpace($HostUrl)) {
  $HostUrl = "http://localhost:3000"
}

locust -f .\locustfile.py --headless -u 25 -r 5 -t 2m --host $HostUrl --html .\results\locust_result.html