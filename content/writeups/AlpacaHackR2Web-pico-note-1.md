---
title: "AlpacaHack Round 2 (Web) - Pico Note 1"
date: "2024-11-06"
tags:
  - writeups
  - ctf
  - js
  - xss
toc: true
math: true
bold: true
nomenu: false
---

## Overview

In this challenge we need to provide a certain `title/content` to the main application in order to trigger XSS. However it is quite tricky 
since that we have a CSP Header with a nonce => `content-security-policy: script-src 'nonce-<random_shit>';` and in order to trigger the XSS we would send an URL to a bot.

So let's explore the code. 

### Code Analysis

We won't check the bot, since it is quite straightforward. The web part however has 2 routes, one for the index and one for the note viewing, the
interesting part here:

```js
app.get("/note", async (req, res) => {
  const title = String(req.query.title);
  const content = String(req.query.content);

  const html = await render("note", {
    nonce: req.nonce,
    data: JSON.stringify({ title, content }),
  });
  res.type("text/html").send(html);
});
```

is that the `render` function is a custom one, which looks like this:

```js
const render = async (view, params) => {
  const tmpl = await fs.readFile(`views/${view}.html`, { encoding: "utf8" });
  const html = Object.entries(params).reduce(
    (prev, [key, value]) => prev.replace(`{{${key}}}`, value),
    tmpl
  );
  return html;
};
```

If we follow the data flow, we would send the query params `title, content` which are getting "stringified" and then passed to `render` which then
is being iterated over with `Object.entries`, I initially thought that there is some trickery within that so I've read the whole documentaton for it, now I know 30 useless facts about `Object.entries` that did not help with solving the thing.

In the meantime I was also trying bunch of things, such as `{{nonce}}` and `</script>`, but without the nonce I cannot invoke anything within the new script tag. I've then moved to `replace` portion of the code, which is the `String.prototype.replace()`, this looked more promising and thank god that `Specifying a string as the replacement` was the in the first couple of scrolls [in here.](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)

Now this another amazing feature of javascript would give us the "*portion of the string that precedes the matched substring.*" using 
`` $` ``. Now I've exprimented a bit with this but I got it on the first/second try.

Payload:

```
$`alert(1)</script>
```

And the rest is straightforward and I am leaving you to figure it out.
