---
title: "Finding Bugs in Python Code"
date: 2022-05-28T02:14:55+03:00
draft: true
---

# Finding Performance Bugs in Python

## Topics

* Memory Profiling
* Line Profiler (pprofile)
* Execution time profiler (cProfile)

## Tools

* cProfile (built-in) (https://docs.python.org/3/library/profile.html#module-cProfile)
* gprof2dot (3rd party) converting output of profilers into a dot graph (https://github.com/jrfonseca/gprof2dot)
* git (bisect) command 
* pprofile (3rd party profiler) (https://github.com/vpelletier/pprofile)
* objgraph (Draws Python object reference graphs with graphviz) (https://pypi.org/project/objgraph/)
* guppy (https://github.com/zhuyifei1999/guppy3/)

## Quick Commands

Running `cProfile` for a module

```console
$ python -m cProfile -o profile -m main 
```

Running Werkzeug's Profiler `ProfilerMiddleware`

```python
from werkzeug.middleware.profiler import ProfilerMiddleware

app = Flask(__name__)
app.wsgi_app = ProfilerMiddleware(app.wsgi_app, profile_dir="./")
```

Creating a degraph from profile binary:

```console
$ gprof2dot -f pstats .\{PATH_TO_PROFILE_FILE} | dot -Tpng -o output.png
```

## Using `pprofile` 

```console
$ pprofile ./main.py
```


# References

* https://chase-seibert.github.io/blog/2013/08/03/diagnosing-memory-leaks-python.html
* https://smira.ru/wp-content/uploads/2011/08/heapy.html
* https://opensourcehacker.com/2008/03/07/debugging-django-memory-leak-with-trackrefs-and-guppy/