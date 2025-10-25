---
title: "Using DNS as C2 Communication - Evasive Techniques (Part 3)"
pubDate: "2022-10-26"
description: "Using DNS for command and control communication as an evasive technique."
tags:
  - Go
  - DNS
  - C2
toc: true
math: true
heroImage: '../../assets/dns-3.png'
---


## Overview
Following my last post about some evasion techniques that the [Symbiote](https://blogs.blackberry.com/en/2022/06/symbiote-a-new-nearly-impossible-to-detect-linux-threat) uses which I tried to recreate in their simplest form, this post will see how the Symbiote is communicating to the command and control [C2](https://www.malwarepatrol.net/command-control-servers-c2-servers-fundamentals/) server.

Upon reading the article, we can see that the Symbiote uses the DNS Protocol to exfiltrate data out of the infected machine, the way that it does that is by chunking it into a bunch of [A](https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/) Resource Records (RR) that it sends through the UDP. The `A` Record looks like this:

```
{PACKET_NUMBER}.{MACHINE_ID}.{HEX_ENCODED_PAYLOAD}.{DOMAIN_NAME}
```

I will deliberately skip the whole authentication process that the malware uses, since it gets out of the scope of the post.

## Why DNS and not {arbitrary protocol}? 

DNS is being used in order to avoid/bypass the firewall rules and in some special scenarios that no TCP outgoing communication is possible.

[Bypassing security products via DNS data exfiltration](https://resources.infosecinstitute.com/topic/bypassing-security-products-via-dns-data-exfiltration/)

## Implementation

I will explain it briefly from the agent's point of view. We are sending the C2 server a beam (in a shape of a DNS request) every n seconds to check if there is a command for us to execute if we receive a non empty Answer with a `TXT` Record (containing a command such as `ls`) we execute that command and after we have the output of the command, we exfiltrate it back to the C2 Server. This happens by sending multiple DNS A record questions (chunks) back to the server. I used the same format that the Symbiote uses for the records.

Note: Each element of a domain name can contain up to 63 chars of information, a full domain name can contain 253 chars. [More info](https://stackoverflow.com/a/28918017)

After the server receives a request with the packet number and the total number of packets (that's the first part of the message) it starts building the output message that we will see after we receive all the packets (through the `{HEX_ENCODED_PAYLOAD}` part of the message).

## Code / Demo

[Repository](https://github.com/syrull/dnsc2) - The repository is created for a starting point to improve/build upon.

![](https://raw.githubusercontent.com/syrull/dnsc2/refs/heads/main/assets/images/demo.gif)

The repository contains both the agent and the server. When the server is being ran it sets the default handler `dns.HandleFunc(".", AgentHandler)` to handle any pattern for domain question this is for convenience, in some other cases you will want to specify some special handles.

### Usage

1. Start the server

```bash
$ go run main.go 127.0.0.1:8053 
```

2. Start the agent

```bash
$ go run ./agent/main.go
```

3. Execute commands on the server side shell (In the case below simple `dir`). Note that I type `cmd /C dir` - [Why?](https://superuser.com/a/1246360)

```bash
><((((> dns c2 by syl <))))><

dnsc2> cmd /C dir
Volume in drive C is OS
Volume Serial Number is XXXX-XXXX

Directory of C:\code\dnsc2\agent

10/28/2022  08:40 PM    <DIR>          .
10/29/2022  11:03 PM    <DIR>          ..
10/28/2022  08:40 PM               481 go.mod
10/28/2022  08:40 PM             3,755 go.sum
10/30/2022  12:37 PM             1,762 main.go
            3 File(s)          5,998 bytes
            2 Dir(s)  107,561,959,424 bytes free
```


## Conclusion

Please note that there could be some easier ways to do this, and some information can be wrong I did my best to research everything that I post here, if you find an error or if you think that something can be improved somewhere you can drop me a message!

# Resources 
- https://blogs.blackberry.com/en/2022/06/symbiote-a-new-nearly-impossible-to-detect-linux-threat
- https://stackoverflow.com/a/28918017
- https://www.cloudflare.com/learning/dns/what-is-dns/
- https://resources.infosecinstitute.com/topic/bypassing-security-products-via-dns-data-exfiltration/